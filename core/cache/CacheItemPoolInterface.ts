/**
 * CacheItemPoolInterface generates CacheItemInterface objects.
 */
import { CacheItemInterface } from './CacheItemInterface'

export interface CacheItemPoolInterface {
  /**
   * Returns a Cache Item representing the specified key.
   *
   * This method must always return a CacheItemInterface object, even in case of
   * a cache miss. It MUST NOT return null.
   *
   * @param string $key
   *   The key for which to return the corresponding Cache Item.
   *
   * @throws InvalidArgumentException
   *   If the $key string is not a legal value a \Psr\Cache\InvalidArgumentException
   *   MUST be thrown.
   *
   * @return CacheItemInterface
   *   The corresponding Cache Item.
   */
  getItem: (key: string) => Promise<CacheItemInterface>

  /**
   * Returns a traversable set of cache items.
   *
   * @param string[] $keys
   *   An indexed array of keys of items to retrieve.
   *
   * @throws InvalidArgumentException
   *   If any of the keys in $keys are not a legal value a \Psr\Cache\InvalidArgumentException
   *   MUST be thrown.
   *
   * @return array|\Traversable
   *   A traversable collection of Cache Items keyed by the cache keys of
   *   each item. A Cache item will be returned for each key, even if that
   *   key is not found. However, if no keys are specified then an empty
   *   traversable MUST be returned instead.
   */
  getItems: (keys: string[]) => Promise<CacheItemInterface[]>

  /**
   * Confirms if the cache contains specified cache item.
   *
   * Note: This method MAY avoid retrieving the cached value for performance reasons.
   * This could result in a race condition with CacheItemInterface::get(). To avoid
   * such situation use CacheItemInterface::isHit() instead.
   *
   * @param string $key
   *   The key for which to check existence.
   *
   * @throws InvalidArgumentException
   *   If the $key string is not a legal value a \Psr\Cache\InvalidArgumentException
   *   MUST be thrown.
   *
   * @return bool
   *   True if item exists in the cache, false otherwise.
   */
  hasItem: (key: string) => Promise<boolean>

  /**
   * Deletes all items in the pool.
   *
   * @return bool
   *   True if the pool was successfully cleared. False if there was an error.
   */
  clear: () => Promise<boolean>

  /**
   * Removes the item from the pool.
   *
   * @param string $key
   *   The key to delete.
   *
   * @throws InvalidArgumentException
   *   If the $key string is not a legal value a \Psr\Cache\InvalidArgumentException
   *   MUST be thrown.
   *
   * @return bool
   *   True if the item was successfully removed. False if there was an error.
   */
  deleteItem: (key: string) => Promise<boolean>

  /**
   * Removes multiple items from the pool.
   *
   * @param string[] $keys
   *   An array of keys that should be removed from the pool.
   * @throws InvalidArgumentException
   *   If any of the keys in $keys are not a legal value a \Psr\Cache\InvalidArgumentException
   *   MUST be thrown.
   *
   * @return bool
   *   True if the items were successfully removed. False if there was an error.
   */
  deleteItems: (keys: string[]) => Promise<boolean>

  /**
   * Persists a cache item immediately.
   *
   * @param InterfaceCacheItem  $item
   *   The cache item to save.
   *
   * @return bool
   *   True if the item was successfully persisted. False if there was an error.
   */
  save: (item: CacheItemInterface) => Promise<boolean>

  /**
   * Sets a cache item to be persisted later.
   *
   * @param CacheItemInterface $item
   *   The cache item to save.
   *
   * @return bool
   *   False if the item could not be queued or if a commit was attempted and failed. True otherwise.
   */
  saveDeferred: (item: CacheItemInterface) => Promise<boolean>

  /**
   * Persists any deferred cache items.
   *
   * @return bool
   *   True if all not-yet-saved items were successfully saved or there were none. False otherwise.
   */
  commit: () => Promise<boolean>
}
