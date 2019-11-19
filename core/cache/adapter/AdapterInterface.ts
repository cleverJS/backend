import { CacheItemPoolInterface } from '../CacheItemPoolInterface'
import { CacheItem } from '../CacheItem'

export interface AdapterInterface extends CacheItemPoolInterface {
  getItem: (key: string) => Promise<CacheItem>
  getItems: (keys: string[]) => Promise<CacheItem[]>
}
