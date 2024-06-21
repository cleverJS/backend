import { loggerNamespace } from '../../logger/logger'
import { Cloner } from '../../utils/clone/Cloner'
import { isNonPrimitive } from '../../utils/reflect'

import { CacheAdapterInterface } from './CacheAdapterInterface'

export class CacheAdapterRuntime extends CacheAdapterInterface {
  protected readonly logger = loggerNamespace('CacheAdapterRuntime')
  protected readonly caches: Map<string, any> = new Map()
  protected readonly keyTags: Map<string, Set<string>> = new Map()
  protected readonly tagKeys: Map<string, Set<string>> = new Map()
  protected readonly ttls: Map<string, number> = new Map()

  public async get<T>(key: string, defaultValue?: T): Promise<T | undefined> {
    await this.checkExpiredByKey(key)
    const cache = this.caches.get(key)

    let result
    if (!cache) {
      result = defaultValue
    } else {
      result = cache
    }

    if (isNonPrimitive(result)) {
      if (Array.isArray(result)) {
        const clonedArray: any = []
        for (const item of result) {
          if (isNonPrimitive(item)) {
            clonedArray.push(Cloner.getInstance().clone(item))
          } else {
            clonedArray.push(item)
          }
        }
        result = clonedArray
      } else {
        result = Cloner.getInstance().clone(result)
      }
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
    if (!Cloner.isCloneable(value)) {
      throw new Error('Non Cloneable object cannot be cached in Runtime, because it will lose its behaviour')
    }

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

  public async clearByTag(tags: string[]): Promise<void> {
    await new Promise((resolve) => {
      const clearPromise: Promise<void>[] = []
      for (const tag of tags) {
        const keySet = this.tagKeys.get(tag)
        if (keySet) {
          const keyArray = Array.from(keySet)
          for (let i = 0; i < keyArray.length; i++) {
            const key = keyArray[i]
            clearPromise.push(this.clear(key).catch(this.logger.error))
          }
        }
      }

      resolve(Promise.all(clearPromise))
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
