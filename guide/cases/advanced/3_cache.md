# Cache

You may use `Cache` module for increasing application performance.

There interface [CacheAdapterInterface](../../../core/cache/adapters/CacheAdapterInterface.ts)
and realization which stores data in runtime [CacheAdapterRuntime](../../../core/cache/adapters/CacheAdapterRuntime.ts)

You may write you own realization for example to store data in [Redis](https://redis.io)

We suggest using it in the following way:

Create singleton container with cache initialization and cleaning by an interval:

```ts
import { CacheAdapterRuntime } from '@cleverjs/backend/core/cache/adapters/CacheAdapterRuntime'
import { Cache } from '@cleverjs/backend/core/cache/Cache'
import { logger } from '@cleverjs/backend/core/logger/logger'

class CacheContainer {
  public cacheRuntime: Cache = new Cache(new CacheAdapterRuntime())
  protected intervalTimerId: NodeJS.Timeout

  constructor() {
    this.intervalTimerId = setInterval(() => {
      this.cacheRuntime.checkExpired().catch(logger.error)
    }, 1000)
    this.intervalTimerId.unref()
  }

  public async clear(): Promise<void> {
    if (this.intervalTimerId) {
      clearInterval(this.intervalTimerId)
    }
    await this.cacheRuntime.clear()
  }
}

export const cacheContainer = new CacheContainer()
```

Call where it is necessary:

```ts
import { AbstractService } from '@cleverjs/backend/core/AbstractService'
import { Condition, TConditionOperator } from '@cleverjs/backend/core/db/Condition'
import { Cache } from '@cleverjs/backend/core/cache/Cache'
import { Article } from './Article'
import { ArticleEntityResource } from './resource/ArticleEntityResource'
import { cacheContainer } from '../../CacheContainer'

export class ArticleService extends AbstractService<Article, ArticleEntityResource> {
  public async findByAuthor(author: string): Promise<Article | null> {
    return cacheContainer.cacheRuntime.getOrSet(
      author,
      () => {
        const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
        return this.resource.findOne(condition)
      },
      Cache.TTL_10MIN
    )
  }
}
```

You may use tag when caching something. It is useful when you need to clear some dependant data:

```ts
public async findByAuthor(author: string): Promise<Article | null> {
  return cacheContainer.cacheRuntime.getOrSet(
    author,
    () => {
      const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
      return this.resource.findOne(condition)
    },
    Cache.TTL_10MIN,
    ['article']
  )
}

public async fetchAuthorList(paginator: Readonly<Paginator>): Promise<string[]> {
  return cacheContainer.cacheRuntime.getOrSet(
    'authors',
    async () => {
      const items = await this.findAll(undefined, paginator)
      return items.map((i) => i.author)
    },
    Cache.TTL_10MIN,
    ['article']
  )
}

public async replaceAuthor(text: string, author: string): Promise<string> {
  const result = text.replace('{{author}}', author)
  await cacheContainer.cacheRuntime.clearByTag(['article'])
  return result
}
```
