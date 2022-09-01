import * as process from 'process'

import { CacheAdapterRuntime } from '../core/cache/adapters/CacheAdapterRuntime'
import { Cache } from '../core/cache/Cache'
import { logger } from '../core/logger/logger'

class CacheContainer {
  public cacheRuntime: Cache = new Cache(new CacheAdapterRuntime())
  protected intervalTimerId: NodeJS.Timer

  constructor() {
    this.intervalTimerId = setInterval(() => {
      this.cacheRuntime.checkExpired().catch(logger.error)
    }, parseInt(process.env.CACHE_CLEAR_INTERVAL || '1000', 10))
  }

  public async clear(): Promise<void> {
    if (this.intervalTimerId) {
      clearInterval(this.intervalTimerId)
    }

    await this.cacheRuntime.clear()
  }
}

export const cacheContainer = new CacheContainer()
