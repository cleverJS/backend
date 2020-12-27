import { Cache } from '../core/cache/Cache'
import { CacheAdapterRuntime } from '../core/cache/adapters/CacheAdapterRuntime'
import { logger } from '../core/logger/logger'

class CacheContainer {
  public cacheRuntime: Cache = new Cache(new CacheAdapterRuntime())

  constructor() {
    setInterval(() => {
      this.cacheRuntime.checkExpired().catch(logger.error)
    }, 60000)
  }
}

export const cacheContainer = new CacheContainer()
