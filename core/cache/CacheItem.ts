import { CacheItemInterface } from './CacheItemInterface'

export class CacheItem implements CacheItemInterface {
  public key: string = ''
  protected value: string = ''
  public hit: boolean = false
  protected expiry: number | null = null
  protected defaultLifetime: number = 0
  protected tags: string[] = []

  public getKey() {
    return this.key
  }

  public get() {
    return this.value
  }

  public isHit() {
    return this.hit
  }

  public set(value: any) {
    this.value = value
    return this
  }

  public expiresAt(expiration: number | Date | null) {
    if (null === expiration) {
      this.expiry = this.defaultLifetime > 0 ? Date.now() + this.defaultLifetime : null
    } else if (expiration instanceof Date) {
      // TODO: Implement. Date to dayjs ?
    }

    return this
  }

  public expiresAfter(time: number | Date | null) {
    if (null === time) {
      this.expiry = this.defaultLifetime > 0 ? Date.now() + this.defaultLifetime : null
    } else if (time instanceof Date) {
      // TODO: Implement. Date to dayjs ?
    } else if (typeof time === 'number') {
      this.expiry = time + Date.now()
    }

    return this
  }

  /**
   * Adds a tag to a cache item.
   *
   * @param {string|string[]} tags A tag or array of tags
   *
   * @return {CacheItem}
   *
   * @throws {Error} When $tag is not valid
   */
  public tag(tags: string[]) {
    for (const tag in tags) {
      if (this.tags[tag]) {
        continue
      }

      if ('' === tag) {
        throw new Error('Tag cannot be empty string')
      }

      if (tag.search('[{}()/@:]') !== -1) {
        throw new Error(`Cache tag "${tag}" contains reserved characters {}()/\@:`)
      }

      this.tags[tag] = tag
    }

    return this
  }
}
