import * as process from 'process'
import { Cache } from '../core/cache/Cache'
import { CacheAdapterRuntime } from '../core/cache/adapters/CacheAdapterRuntime'
import { logger } from '../core/logger/logger'

class CacheContainer {
  public cacheRuntime: Cache = new Cache(new CacheAdapterRuntime())

  constructor() {
    setInterval(() => {
      this.cacheRuntime.checkExpired().catch(logger.error)
    }, parseInt(process.env.CACHE_CLEAR_INTERVAL || '1000', 10))
  }
}

export const cacheContainer = new CacheContainer()
