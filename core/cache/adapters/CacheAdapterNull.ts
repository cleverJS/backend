import { CacheAdapterInterface } from './CacheAdapterInterface'

export class CacheAdapterNull implements CacheAdapterInterface {
  public get(key: string, defaultValue?: any): Promise<any | undefined> {
    return Promise.resolve(defaultValue)
  }
  public async set(key: string, value: any, ttl?: number | null, tags?: string[]): Promise<void> {}
  public getOrSet(key: string, fn: () => Promise<any>, ttl?: number | null, tags?: string[]): Promise<any> {
    return fn()
  }
  public async clear(key?: string): Promise<void> {}
  public async clearByTag(tag: string): Promise<void> {}
  public async checkExpired(): Promise<void> {}
}
