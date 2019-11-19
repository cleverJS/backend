# Article

In cubes folder create Article with the following structure:

- Article.ts
- ArticleController.ts
- ArticleService.ts
- resource/ArticleResourceSql.ts

Article has the following fields - id, title, author. Describe article entity
```typescript
import { AbstractEntity, IAbstractEntityData } from '../../../core/entity/AbstractEntity'
import * as yup from 'yup'

export interface IArticleData extends IAbstractEntityData {
  title: string
  author: string
}

export class Article extends AbstractEntity implements IArticleData {
  public title = ''
  public author = ''

  public getData(): IArticleData {
    const data: any = {}
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        data[key] = this[key]
      }
    }

    return Article.cast(data)
  }

  public static cast(data: IArticleData) {
    return yup
      .object()
      .shape({
        id: yup.string(),
        title: yup.string(),
        author: yup.string(),
      })
      .noUnknown()
      .cast(data)
  }
}
```

ArticleService. It should contains standard methods for usual CRUD
(extend it with AbstractService) and also fetching articles by author

```typescript
import { AbstractResource } from '../../../core/db/AbstractResource'
import { Article } from './Article'
import { AbstractService, IAbstractDependenciesList } from '../../../core/AbstractService'
import { Condition } from '../../../core/db/Condition'

export interface IDependenciesList extends IAbstractDependenciesList<Article> {
  resource: AbstractResource<Article>
}

export class ArticleService extends AbstractService<Article> {
  protected deps!: IDependenciesList

  constructor(deps: IDependenciesList) {
    super(deps)
  }

  public async findByAuthor(author: string) {
    const condition = new Condition([{ operator: Condition.EQUALS, field: 'author', value: author }])
    return await this.deps.resource.findOne(condition)
  }
}
``` 

ArticleResourceMongo. It contains map which transform keys and values to appropriate
entity fields

```typescript
import { AbstractMongoResource } from '../../../../core/db/mongo/AbstractMongoResource'
import { Article, IArticleData } from '../Article'
import { AbstractObject } from '../../../../core/AbstractObject'
import { morphism } from 'morphism'
import { ObjectId } from 'mongodb'

export class ArticleResourceMongo extends AbstractMongoResource<Article> {
  protected collectionName = 'article'

  public static scheme = {
    id: {
      path: '_id',
      fn: (value: ObjectId) => {
        return value.toHexString()
      },
    },
    title: 'title',
    author: 'author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  protected map(data: AbstractObject): IArticleData {
    return morphism(ArticleResourceMongo.scheme, data) as any
  }
}
```

ArticleController. It allows WebSocket and HTTP connections.

With the help of WebSocket article could be fetched by ID

With the help of HTTP article could be fetched by ID and saved

```typescript
import { HttpServer } from '../../../core/http/HttpServer'
import { logger } from '../../../core/logger/logger'
import { ArticleService } from './ArticleService'
import { ServerResponse } from 'http'
import { FastifyReply, FastifyRequest } from 'fastify'
import { Redis } from '../../../core/db/redis/Redis'
import { WSServer } from '../../../core/ws/WSServer'
import { WSRequest } from '../../../core/ws/WSRequest'
import { Cache } from '../../../core/cache/Cache'
import { Article } from './Article'
import { EntityFactory } from '../../../core/entity/EntityFactory'

interface IDependencies {
  articleService: ArticleService
  wsServer: WSServer
  http: HttpServer
  cache: Cache
  redis: Redis
}

export class ArticleController {
  protected readonly deps: IDependencies

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.init().catch(logger.error)
  }

  private async init() {
    this.deps.wsServer.onRequest('article', 'get', this.actionWSGet)
    const instance = this.deps.http.getServer()
    instance.get('/article', this.actionGet)
    instance.get('/articleService/save', this.actionSave)
  }

  private actionWSGet = async (request: WSRequest) => {
    const { id } = request.payload
    const result = await this.deps.articleService.findById(id)

    return {
      status: 'success',
      data: {
        article: result,
      },
    }
  }

  private actionGet = async (request: FastifyRequest, response: FastifyReply<ServerResponse>) => {
    logger.info(request)
    const result = await this.deps.articleService.findById('5d47fe7f8246db8ab76b475e')

    response.send({
      status: 'success',
      data: {
        article: result,
      },
    })
  }

  private actionSave = async () => {
    const factory = new EntityFactory(Article, Article.cast)
    const item = factory.create({
      title: 'hello',
    })
    const result = await this.deps.articleService.save(item)
    return {
      hello: 'Create item',
      collection: result,
    }
  }
}
```

Register cube in application.

In `ResourceContainer` initialize `ArticleResource`

```typescript
import { ArticleResourceMongo } from './cubes/article/resource/ArticleResourceMongo'
import { EntityFactory } from '../core/entity/EntityFactory'
import { Article } from './cubes/article/Article'
import { Mongo } from '../core/db/mongo/Mongo'

export class ResourceContainer {
  public readonly articleResource: ArticleResourceMongo

  constructor(mongo: Mongo) {
    this.articleResource = new ArticleResourceMongo(mongo, new EntityFactory(Article, Article.cast))
  }
}
```

In `ServiceContainer` initialize `ArticleService`
```typescript
import { ResourceContainer } from './ResourceContainer'
import { ArticleService } from './cubes/article/ArticleService'

export class ServiceContainer {
  public readonly articleService: ArticleService

  public constructor(resources: ResourceContainer) {
    this.articleService = new ArticleService({
      resource: resources.articleResource,
    })
  }
}
```

In `RouteContainer` initialize `ArticleController`
```typescript
import { ArticleController } from './cubes/article/ArticleController'
import { ServiceContainer } from './ServiceContainer'
import { HttpServer } from '../core/http/HttpServer'
import { Cache } from '../core/cache/Cache'
import { Redis } from '../core/db/redis/Redis'
import { WSServer } from '../core/ws/WSServer'

export class RouteContainer {
  public constructor(services: ServiceContainer, http: HttpServer, cache: Cache, redis: Redis, wsServer: WSServer) {
    this.init(services, http, cache, redis, wsServer)
  }

  protected init(services: ServiceContainer, http: HttpServer, cache: Cache, redis: Redis, wsServer: WSServer) {
    new ArticleController({
      cache,
      redis,
      wsServer,
      http,
      articleService: services.articleService,
    })
  }
}
```
