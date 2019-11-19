import { AdapterInterface } from './AdapterInterface'
import { CacheItemInterface } from '../CacheItemInterface'
import { CacheItem } from '../CacheItem'
import { Redis } from '../../db/redis/Redis'
import { logger } from '../../logger/logger'

interface IDependencies {
  redis: Redis
}

export class RedisAdapter implements AdapterInterface {
  private readonly deps: IDependencies

  public constructor(deps: IDependencies) {
    this.deps = deps
  }

  public async getItem(key: string) {
    return JSON.parse(await this.deps.redis.get(key))
  }

  public async getItems(keys: string[]) {
    return (await this.deps.redis.mget(keys)).map(i => {
      return JSON.parse(i)
    })
  }

  public async hasItem(key: string) {
    return await this.deps.redis.exists([key]) > 0
  }

  public async clear() {
    return true
  }

  public async deleteItem(key: string) {
    return await this.deps.redis.del([key]) > 0
  }

  public async deleteItems(keys: string[]) {
    return await this.deps.redis.del(keys) > 0
  }

  public async save(item: CacheItemInterface) {
    const result = await this.deps.redis.set(item.getKey(), JSON.stringify(item))
    logger.info('save', result)
    return false
  }

  public async saveDeferred(item: CacheItemInterface) {
    logger.info(item)
    return false
  }

  public async commit() {
    return false
  }

  public generateItems(keys: string[]) {
    const items = []
    for (const key in keys) {
      items.push(this.createCacheItem(key))
    }

    return items
  }

  private createCacheItem(key: string) {
    const item = new CacheItem()
    item.key = key

    return item
  }
}
