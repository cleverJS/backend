import { CacheAdapterInterface } from './CacheAdapterInterface'
import { ESetTTLMode, Redis } from '../../db/redis/Redis'
import { loggerNamespace } from '../../logger/logger'

const PREFIX = process.env.REDIS_CACHE_PREFIX || 'cache'

export class CacheAdapterRedis extends CacheAdapterInterface {
  protected redis: Redis
  protected logger = loggerNamespace('CacheAdapterRedis')

  public constructor(redisClient: Redis) {
    super()
    this.redis = redisClient
  }

  public async get(key: string, defaultValue?: unknown): Promise<unknown | undefined> {
    let result = await this.redis.client.get(CacheAdapterRedis.createKey(key))

    if (result) {
      result = JSON.parse(result)
    }

    return result || defaultValue
  }

  public async set(key: string, value: unknown, ttl?: number | null, tags?: string[]): Promise<void> {
    try {
      const redisKey = CacheAdapterRedis.createKey(key)
      const data: string = JSON.stringify(value)

      const multi = this.redis.client.multi()
      if (tags) {
        tags.forEach((tag) => {
          multi.sAdd(CacheAdapterRedis.createTagKey(tag), redisKey)
        })
      }

      if (ttl) {
        multi.set(redisKey, data, { [ESetTTLMode.ex]: ttl || 0 })
      } else {
        multi.set(redisKey, data)
      }

      await multi.exec()
    } catch (e) {
      this.logger.error(e)
    }
  }

  public async clear(key?: string): Promise<void> {
    const keys = key ? [CacheAdapterRedis.createKey(key)] : await this.redis.client.keys(`${PREFIX}:*`)
    if (keys.length) {
      await this.redis.client.del(keys)
    }
  }

  public async clearByTag(tags: string[]): Promise<void> {
    const promises = tags.map((tag) => this.redis.client.sMembers(CacheAdapterRedis.createTagKey(tag)))
    const keys = (await Promise.all(promises)).flat()

    try {
      const multi = this.redis.client.multi()

      keys.forEach((key) => {
        multi.del(key)
      })

      tags.forEach((tag) => {
        multi.del(CacheAdapterRedis.createTagKey(tag))
      })

      await multi.exec()
    } catch (err) {
      this.logger.error(err)
    }
  }

  public async checkExpired(): Promise<void> {
    // NOTHING TO DO
  }

  public static createKey(key: string): string {
    return `${PREFIX}:${key.replace('_', ':')}`
  }

  public static createTagKey(key: string): string {
    return `${PREFIX}:tags:${key.replace('_', ':')}`
  }
}
