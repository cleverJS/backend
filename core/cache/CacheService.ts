import { CacheItemPoolInterface } from './CacheItemPoolInterface'

export class CacheService {
  protected cache: CacheItemPoolInterface

  public constructor(cache: CacheItemPoolInterface) {
    this.cache = cache
  }

  public getCache(): CacheItemPoolInterface {
    return this.cache
  }
}
