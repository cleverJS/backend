export abstract class CacheAdapterInterface {
  /**
   *
   * @param key
   * @param fn
   * @param ttl - in seconds
   * @param tags
   */
  public async getOrSet(key: string, fn: () => Promise<any>, ttl?: number | null, tags?: string[]): Promise<unknown> {
    let result = await this.get(key)
    if (result === undefined) {
      result = await fn()
      await this.set(key, result, ttl, tags)
    }
    return result
  }

  public abstract get(key: string, defaultValue?: unknown): Promise<unknown | undefined>
  public abstract set(key: string, value: unknown, ttl?: number | null, tags?: string[]): Promise<void>
  public abstract clear(key?: string): Promise<void>
  public abstract clearByTag(tags: string[]): Promise<void>
  public abstract checkExpired(): Promise<void>
}
