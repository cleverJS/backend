import { Cache } from '../../core/cache/Cache'
import { CacheAdapterNull } from '../../core/cache/adapters/CacheAdapterNull'
import { sleep } from '../../core/utils/sleep'
import { CacheAdapterRedis } from '../../core/cache/adapters/CacheAdapterRedis'
import { Redis } from '../../core/db/redis/Redis'

describe('Test Cache', () => {
  const redis = new Redis({
    host: 'localhost',
    port: 6379,
    db: 0,
  })
  let cacheAdapter = new CacheAdapterRedis(redis)

  beforeEach(async () => {
    cacheAdapter = new CacheAdapterRedis(redis)
    await cacheAdapter.clear()
  })

  afterAll(async () => {
    await cacheAdapter.clear()
    await redis.destroy()
  })

  test('should cache string', async () => {
    const cache = new Cache(cacheAdapter)

    await cache.set('test1', 'this is string')

    const result = await cache.get('test1')
    expect(result).toEqual('this is string')
  })

  test('should cache getOrSet', async () => {
    const cache = new Cache(cacheAdapter)

    let result = await cache.getOrSet('test1', () => {
      return Promise.resolve('this is string')
    })
    expect(result).toEqual('this is string')

    result = await cache.getOrSet('test1', () => {
      return Promise.resolve('this is string')
    })
    expect(result).toEqual('this is string')
  })

  test('should cache object', async () => {
    const cache = new Cache(cacheAdapter)

    await cache.set('test1', {
      test: 'string',
      test2: 12,
    })

    const result = await cache.get('test1')
    expect(result).toEqual({
      test: 'string',
      test2: 12,
    })
  })

  test('should clear cache by ttl on get', async () => {
    const cache = new Cache(cacheAdapter)

    await cache.set('test1', 'this is string', 1)
    const result1 = await cache.get('test1')
    expect(result1).toEqual('this is string')
    await sleep(1000)
    const result2 = await cache.get('test1')
    expect(result2).toBeUndefined()
  })

  test('should clear cache by ttl', async () => {
    const cache = new Cache(cacheAdapter)

    await cache.set('test1', 'this is string', 1)
    await cache.set('test2', 'this is string2')
    let result = await cache.get('test1')
    expect(result).toEqual('this is string')
    await sleep(1000)
    await cache.checkExpired()
    result = await cache.get('test1')
    expect(result).toBeUndefined()

    result = await cache.get('test2')
    expect(result).toEqual('this is string2')
  })

  test('should clear cache by key', async () => {
    const cache = new Cache(cacheAdapter)

    await cache.set('test1', 'this is string')
    const result1 = await cache.get('test1')
    expect(result1).toEqual('this is string')

    await cache.clear('test1')

    const result2 = await cache.get('test1')
    expect(result2).toBeUndefined()
  })

  test('should clear all cache', async () => {
    const cache = new Cache(cacheAdapter)

    await cache.set('test1', 'this is string')
    await cache.set('test2', 'this is string2', Cache.TTL_1MIN, ['tag2'])
    let result = await cache.get('test1')
    expect(result).toEqual('this is string')

    result = await cache.get('test2')
    expect(result).toEqual('this is string2')

    await cache.clear()

    result = await cache.get('test1')
    expect(result).toBeUndefined()

    result = await cache.get('test2')
    expect(result).toBeUndefined()
  })

  test('should cache with tag and clean by tag', async () => {
    const cache = new Cache(cacheAdapter)

    await cache.set('test1', 'this is string', Cache.TTL_1MIN, ['tag1'])
    await cache.set('test2', 'this is string2', Cache.TTL_1MIN, ['tag1'])
    await cache.set('test3', 'this is string3', Cache.TTL_1MIN, ['tag2'])

    let result = await cache.get('test1')
    expect(result).toEqual('this is string')

    result = await cache.get('test2')
    expect(result).toEqual('this is string2')

    result = await cache.get('test3')
    expect(result).toEqual('this is string3')

    await cache.clearByTag(['tag1'])
    result = await cache.get('test1')
    expect(result).toBeUndefined()

    result = await cache.get('test2')
    expect(result).toBeUndefined()

    result = await cache.get('test3')
    expect(result).toEqual('this is string3')
  })

  test('should cache with tag and clean by ttl', async () => {
    const cache = new Cache(cacheAdapter)

    await cache.set('test1', 'this is string', 1, ['tag1'])
    await cache.set('test2', 'this is string2', 1, ['tag1'])
    await cache.set('test3', 'this is string3', 1, ['tag2'])

    let result = await cache.get('test1')
    expect(result).toEqual('this is string')

    result = await cache.get('test2')
    expect(result).toEqual('this is string2')

    result = await cache.get('test3')
    expect(result).toEqual('this is string3')

    await sleep(1000)

    result = await cache.get('test1')
    expect(result).toBeUndefined()

    result = await cache.get('test2')
    expect(result).toBeUndefined()

    result = await cache.get('test3')
    expect(result).toBeUndefined()
  })

  test('should work with null adapter', async () => {
    const cacheAdapterNull = new CacheAdapterNull()
    const cache = new Cache(cacheAdapterNull)

    await cache.getOrSet('test1', () => {
      return Promise.resolve('this is string')
    })
    await cache.set('test2', 'this is string')
    await cache.set('test3', 'this is string', Cache.TTL_1MIN, ['tag1'])
    const result = await cache.get('test1')
    expect(result).toBeUndefined()
    await cache.clearByTag(['tag1'])
    await cache.checkExpired()
    await cache.clear('test3')
    await cache.clear()
  })
})
