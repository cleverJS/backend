export interface CacheAdapterInterface {
  get(key: string, defaultValue?: any): Promise<any | undefined>
  set(key: string, value: any, ttl?: number | null, tags?: string[]): Promise<void>
  getOrSet(key: string, fn: () => Promise<any>, ttl?: number | null, tags?: string[]): Promise<any>
  clear(key?: string): Promise<void>
  clearByTag(tag: string): Promise<void>
  checkExpired(): Promise<void>
}
