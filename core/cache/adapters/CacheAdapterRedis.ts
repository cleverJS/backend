import { CacheAdapterInterface } from './CacheAdapterInterface'
import { ESetTTLMode, Redis } from '../../db/redis/Redis'

const PREFIX = process.env.REDIS_CACHE_PREFIX || 'cache'

export class CacheAdapterRedis extends CacheAdapterInterface {
  protected redis: Redis

  public constructor(redisClient: Redis) {
    super()
    this.redis = redisClient
  }

  public async get(key: string, defaultValue?: unknown): Promise<unknown | undefined> {
    let result = await this.redis.get(CacheAdapterRedis.createKey(key))

    if (result) {
      result = JSON.parse(result)
    }

    return result || defaultValue
  }

  public async set(key: string, value: unknown, ttl?: number | null, tags?: string[]): Promise<void> {
    await new Promise((resolve, reject) => {
      try {
        const redisKey = CacheAdapterRedis.createKey(key)
        const data: string = JSON.stringify(value)
        // if (typeof value !== 'string') {
        //   if (typeof value === 'object') {
        //     data = JSON.stringify(value)
        //   } else if (typeof value === 'number') {
        //     data = String(value)
        //   } else {
        //     reject(new Error('Unknown value'))
        //     return
        //   }
        // } else {
        //   data = value
        // }

        const multi = this.redis.client.multi()
        if (tags) {
          tags.forEach((tag) => {
            multi.sadd(CacheAdapterRedis.createTagKey(tag), redisKey)
          })
        }

        if (ttl) {
          multi.set(redisKey, data, ESetTTLMode.ex, ttl || 0)
        } else {
          multi.set(redisKey, data)
        }

        multi.exec((err, result) => {
          if (err) {
            reject(err)
            return
          }

          resolve(result.length > 1 && result[1] === 'OK')
        })
      } catch (e) {
        reject(e)
      }
    })
  }

  public async clear(key?: string): Promise<void> {
    const keys = key ? [CacheAdapterRedis.createKey(key)] : await this.redis.keys(PREFIX)
    await this.redis.del(keys)
  }

  public async clearByTag(tags: string[]): Promise<void> {
    const promises = tags.map((tag) => this.redis.smembers(CacheAdapterRedis.createTagKey(tag)))
    const keys = (await Promise.all(promises)).flat()

    await new Promise((resolve, reject) => {
      try {
        const multi = this.redis.client.multi()

        keys.forEach((key) => {
          multi.del(key)
        })

        tags.forEach((tag) => {
          multi.del(CacheAdapterRedis.createTagKey(tag))
        })

        multi.exec((err, result) => {
          if (err) {
            reject(err)
            return
          }

          resolve(result.length > 1 && result[1] === 'OK')
        })
      } catch (err) {
        reject(err)
      }
    })
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
