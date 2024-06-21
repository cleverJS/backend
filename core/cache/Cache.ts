import { loggerNamespace } from '../logger/logger'

import { CacheAdapterInterface } from './adapters/CacheAdapterInterface'
import { CacheAdapterNull } from './adapters/CacheAdapterNull'

export class Cache implements CacheAdapterInterface {
  public static TTL_1MIN = 60
  public static TTL_5MIN = 300
  public static TTL_10MIN = 600
  public static TTL_HOUR = 3600
  public static TTL_DAY = 86400
  public static TTL_WEEK = 604800
  public static TTL_MONTH = 2592000

  protected logger = loggerNamespace('Cache')
  protected adapter: CacheAdapterInterface

  public constructor(adapter?: CacheAdapterInterface) {
    this.adapter = adapter || new CacheAdapterNull()
  }

  public setAdapter(adapter: CacheAdapterInterface): void {
    this.adapter = adapter
    this.checkExpired().catch(this.logger.error)
  }

  public get<T>(key: string, defaultValue?: any): Promise<T | undefined> {
    return this.adapter.get<T>(key, defaultValue)
  }

  public set(key: string, value: any, ttl?: number | null, tags?: string[]): Promise<void> {
    return this.adapter.set(key, value, ttl || undefined, tags || undefined)
  }

  public getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number | null, tags?: string[]): Promise<T | undefined> {
    return this.adapter.getOrSet<T>(key, fn, ttl || undefined, tags || undefined)
  }

  public clear(key?: string): Promise<void> {
    return this.adapter.clear(key || undefined)
  }

  public clearByTag(tags: string[]): Promise<void> {
    return this.adapter.clearByTag(tags)
  }

  public checkExpired(): Promise<void> {
    return this.adapter.checkExpired()
  }
}
