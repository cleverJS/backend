# Cache

You may use `Cache` module for increasing application performance.

There interface [CacheAdapterInterface](core/cache/adapters/CacheAdapterInterface.ts)
and realization which stores data in runtime [CacheAdapterRuntime](core/cache/adapters/CacheAdapterRuntime.ts)

You may write you own realization for example to store data in [Redis](https://redis.io)

We suggest using it in the following way:

Create singleton container with cache initialization and cleaning by an interval:

```ts
class CacheContainer {
  public cacheRuntime: Cache = new Cache(new CacheAdapterRuntime())

  constructor() {
    setInterval(() => {
      this.cacheRuntime.checkExpired().catch(logger.error)
    }, 60_000)
  }
}

export const cacheContainer = new CacheContainer()
```

Call where it is necessary:

```ts
import { AbstractService } from 'cleverJS/core/AbstractService'
import { Condition, TConditionOperator } from 'cleverJS/core/db/Condition'
import { Cache } from 'cleverJS/core/cache/Cache'
import { Article } from './Article'
import { ArticleResource } from './resource/ArticleResource'
import { cacheContainer } from '../../CacheContainer'

export class ArticleService extends AbstractService<Article, ArticleResource> {
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
  await cacheContainer.cacheRuntime.clearByTag('article')
  return result
}
```
