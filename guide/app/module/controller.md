# Controller

In controller we defines a way to catch and handle request. With the help of WebSocket or HTTP(s) Server

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

As a fourth(4) parameter we could pass validation method.

``this.deps.wsServer.onRequest('article', 'get', this.actionWSGet)``

It could be used for validate access and any parameters (email, required fields and so on)
