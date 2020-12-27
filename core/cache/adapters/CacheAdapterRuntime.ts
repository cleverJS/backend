import { CacheAdapterInterface } from './CacheAdapterInterface'
import { loggerNamespace } from '../../logger/logger'

export class CacheAdapterRuntime implements CacheAdapterInterface {
  protected readonly logger = loggerNamespace('CacheAdapterRuntime')
  protected readonly caches: Map<string, any> = new Map()
  protected readonly keyTags: Map<string, Set<string>> = new Map()
  protected readonly tagKeys: Map<string, Set<string>> = new Map()
  protected readonly ttls: Map<string, number> = new Map()

  public async get(key: string, defaultValue?: unknown): Promise<unknown | undefined> {
    await this.checkExpiredByKey(key)
    const cache = this.caches.get(key)
    let result
    if (!cache) {
      result = defaultValue
    } else {
      result = cache
    }

    return result
  }

  /**
   *
   * @param key
   * @param value
   * @param ttl - in seconds
   * @param tags
   */
  public set(key: string, value: unknown, ttl?: number | null, tags?: string[]): Promise<void> {
    this.caches.set(key, value)

    if (ttl) {
      this.ttls.set(key, new Date().getTime() + ttl * 1000)
    }

    if (tags && tags.length) {
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i]
        this.addValue(tag, key, this.tagKeys)
        this.addValue(key, tag, this.keyTags)
      }
    }

    return Promise.resolve()
  }

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
      this.set(key, result, ttl, tags).catch(this.logger.error)
    }
    return result
  }

  public clear(key?: string): Promise<void> {
    return new Promise((resolve) => {
      if (key) {
        this.caches.delete(key)
        this.ttls.delete(key)
        this.clearKeyFromTagMap(key)
      } else {
        this.caches.clear()
        this.tagKeys.clear()
        this.keyTags.clear()
        this.ttls.clear()
      }
      resolve()
    })
  }

  public clearByTag(tag: string): Promise<void> {
    return new Promise((resolve) => {
      const clearPromise = []
      const keySet = this.tagKeys.get(tag)
      if (keySet) {
        const keyArray = Array.from(keySet)
        for (let i = 0; i < keyArray.length; i++) {
          const key = keyArray[i]
          clearPromise.push(this.clear(key))
        }

        Promise.all(clearPromise).catch(this.logger.error)
        resolve()
      }
    })
  }

  public checkExpired(): Promise<void> {
    return new Promise((resolve) => {
      const now = new Date().getTime()
      const clearPromise = []
      for (const [key, ttl] of this.ttls) {
        if (ttl && ttl < now) {
          clearPromise.push(this.clear(key))
        }
      }

      Promise.all(clearPromise).catch(this.logger.error)
      resolve()
    })
  }

  protected checkExpiredByKey(key: string, now?: number): Promise<void> {
    return new Promise((resolve) => {
      if (!now) {
        now = new Date().getTime()
      }
      const ttl = this.ttls.get(key)
      if (ttl && ttl < now) {
        this.clear(key).catch(this.logger.error)
      }

      resolve()
    })
  }

  protected clearKeyFromTagMap(key: string): void {
    const tagSet = this.keyTags.get(key)
    if (tagSet) {
      const tagArray = Array.from(tagSet)
      for (let i = 0; i < tagArray.length; i++) {
        const tag = tagArray[i]
        const keySet = this.tagKeys.get(tag)
        if (keySet) {
          keySet.delete(key)
          if (!keySet.size) {
            this.tagKeys.delete(tag)
          }
        }
      }
      this.keyTags.delete(key)
    }
  }

  protected addValue(key: string, value: string, map: Map<string, Set<string>>): void {
    let set = map.get(key)
    if (!set) {
      set = new Set<string>()
    }
    set.add(value)
    map.set(key, set)
  }
}
