# Article

In modules folder create Article with the following structure:

- Article.ts
- ArticleController.ts
- ArticleService.ts
- resource/ArticleResource.ts

Article has the following fields - id, title, author. Describe article entity
```typescript
import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import { AbstractObject } from '../../../core/AbstractObject'
import * as yup from 'yup'

const scheme = yup.object().shape({
  id: yup.number(),
  title: yup.string(),
  author: yup.string(),
  content: yup.string(),
})

type TArticle = yup.InferType<typeof scheme>

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public title = ''
  public author = ''
  public content = ''

  public static cast(data: AbstractObject): TArticle {
    return scheme.noUnknown().cast(data)
  }
}
```

ArticleService. It should contains standard methods for usual CRUD
(extend it with AbstractService) and also fetching articles by author

```typescript
import { Article } from './Article'
import { AbstractService, IAbstractDependenciesList } from '../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { ArticleResource } from './resource/ArticleResource'

export interface IDependenciesList extends IAbstractDependenciesList<Article> {
  resource: ArticleResource
}

export class ArticleService extends AbstractService<Article> {
  protected deps!: IDependenciesList

  constructor(deps: IDependenciesList) {
    super(deps)
  }

  public async findByAuthor(author: string) {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
    return await this.deps.resource.findOne(condition)
  }
}
``` 

ArticleResource. It contains map which transform keys and values to appropriate
entity fields

```typescript
import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { AbstractObject } from '../../../../core/AbstractObject'
import { Article } from '../Article'
import { morphism } from 'morphism'

export class ArticleResource extends AbstractDBResource<Article> {
  protected table = 'article'

  public static scheme = {
    id: 'id',
    title: 'title',
    author: 'Author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  public static schemeToDB = {
    id: 'id',
    title: 'title',
    author: 'Author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  protected map(data: AbstractObject): typeof ArticleResource.scheme {
    return morphism(ArticleResource.scheme, data) as any
  }

  protected mapToDB(item: Article): any {
    return morphism(ArticleResource.schemeToDB, item.getData())
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

Register module in application.

In `ResourceContainer` initialize `ArticleResource`

```typescript
import { EntityFactory } from '../core/entity/EntityFactory'
import { Article } from './modules/article/Article'
import Knex from 'knex'
import { ArticleResource } from './modules/article/resource/ArticleResource'
import { ConditionDbParser } from '../core/db/sql/condition/ConditionDbParser'

export class ResourceContainer {
  public readonly articleResource: ArticleResource

  constructor(connection: Knex) {
    this.articleResource = new ArticleResource(connection, new ConditionDbParser(), new EntityFactory(Article, Article.cast))
  }
}

```

In `ServiceContainer` initialize `ArticleService`
```typescript
import { ResourceContainer } from './ResourceContainer'
import { ArticleService } from './modules/article/ArticleService'

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
import { ArticleController } from './modules/article/ArticleController'
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
