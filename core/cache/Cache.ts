import { CacheService } from './CacheService'
import { CacheItem } from './CacheItem'

export class Cache {
  public static TTL_1MIN = 60
  public static TTL_5MIN = 300
  public static TTL_10MIN = 600
  public static TTL_HOUR = 3600
  public static TTL_DAY = 86400
  public static TTL_WEEK = 604800
  public static TTL_MONTH = 2592000

  protected service: CacheService

  public constructor(service: CacheService) {
    this.service = service
  }

  public async get(key: string | string[]) {
    const item = await this.service.getCache().getItem(Cache.key(key))
    if (item.isHit()) {
      return item.get()
    }

    return null
  }

  public async set(key: string | string[], value: any, ttl?: number, tags: string[] = []) {
    const item = await this.service.getCache().getItem(Cache.key(key))
    item.set(value)

    if (ttl) {
      item.expiresAt(ttl)
    }

    if (tags && item instanceof CacheItem) {
      item.tag(tags)
      throw new Error('Implement functionality')
    }

    this.service.getCache().save(item)
  }

  public invalidate(key: string) {
    return this.service.getCache().deleteItem(Cache.key(key))
  }

  public invalidateTags() {
    throw new Error('Implement functionality')
  }

  /**
   * Create PSR-6 valid key
   * @param {string | string[]} key
   *
   * @return {string}
   */
  public static key(key: string | string[]): string {
    let tmpKey: string
    if (Array.isArray(key)) {
      tmpKey = JSON.stringify(key)
    } else {
      tmpKey = key
    }

    return tmpKey.replace(/[W]/, '_')
  }
}
