export abstract class CacheAdapterInterface {
  /**
   *
   * @param key
   * @param fn
   * @param ttl - in seconds
   * @param tags
   */
  public async getOrSet<T>(key: string, fn: () => Promise<T>, ttl?: number | null, tags?: string[]): Promise<T | undefined> {
    let result = await this.get<T>(key)
    if (!result) {
      result = await fn()
      await this.set(key, result, ttl, tags)
    }

    return this.get<T>(key)
  }

  public abstract get<T>(key: string, defaultValue?: T): Promise<T | undefined>
  public abstract set(key: string, value: unknown, ttl?: number | null, tags?: string[]): Promise<void>
  public abstract clear(key?: string): Promise<void>
  public abstract clearByTag(tags: string[]): Promise<void>
  public abstract checkExpired(): Promise<void>
}
