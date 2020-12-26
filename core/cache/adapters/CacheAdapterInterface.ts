export interface CacheAdapterInterface {
  get(key: string, defaultValue?: unknown): Promise<unknown | undefined>
  set(key: string, value: unknown, ttl?: number | null, tags?: string[]): Promise<void>
  getOrSet(key: string, fn: () => Promise<any>, ttl?: number | null, tags?: string[]): Promise<unknown>
  clear(key?: string): Promise<void>
  clearByTag(tag: string): Promise<void>
  checkExpired(): Promise<void>
}
