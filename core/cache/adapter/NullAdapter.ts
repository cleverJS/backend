import { AdapterInterface } from './AdapterInterface'
import { CacheItem } from '../CacheItem'
import { CacheItemInterface } from '../CacheItemInterface'

export class NullAdapter implements AdapterInterface {
  public async getItem(key: string) {
    return this.createCacheItem(key)
  }

  public async getItems(keys: string[]) {
    return this.generateItems(keys)
  }

  // @ts-ignore
  public async hasItem(key: string) {
    return false
  }

  public async clear() {
    return true
  }

  // @ts-ignore
  public async deleteItem(key: string) {
    return true
  }

  // @ts-ignore
  public async deleteItems(keys: string[]) {
    return true
  }

  // @ts-ignore
  public async save(item: CacheItemInterface) {
    return false
  }

  // @ts-ignore
  public async saveDeferred(item: CacheItemInterface) {
    return false
  }

  public async commit() {
    return false
  }

  public generateItems(keys: string[]) {
    const items = []
    for (const key in keys) {
      items.push(this.createCacheItem(key))
    }

    return items
  }

  private createCacheItem(key: string) {
    const item = new CacheItem()
    item.key = key

    return item
  }
}
