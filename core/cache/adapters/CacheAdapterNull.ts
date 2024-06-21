import { CacheAdapterInterface } from './CacheAdapterInterface'

export class CacheAdapterNull implements CacheAdapterInterface {
  public get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    return Promise.resolve(defaultValue)
  }
  public async set(key: string, value: unknown, ttl?: number | null, tags?: string[]): Promise<void> {}
  public getOrSet<T>(key: string, fn: () => Promise<any>, ttl?: number | null, tags?: string[]): Promise<T> {
    return fn()
  }
  public async clear(key?: string): Promise<void> {}
  public async clearByTag(tags: string[]): Promise<void> {}
  public async checkExpired(): Promise<void> {}
}
