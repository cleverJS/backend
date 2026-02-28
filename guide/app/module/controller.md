# Controller

In controller we defines a way to catch and handle request. With the help of WebSocket or HTTP(s) Server

```typescript
import { HttpServerFastify } from '../../../core/http/servers/HttpServerFastify'
import { loggerNamespace } from '../../../core/logger/logger'
import { ArticleService } from './ArticleService'
import { FastifyReply, FastifyRequest } from 'fastify'
import { WSServer } from '../../../core/ws/WSServer'
import { WSRequest } from '../../../core/ws/WSRequest'
import { Cache } from '../../../core/cache/Cache'
import { Article } from './Article'
import { EntityFactory } from '../../../core/entity/EntityFactory'

interface IDependencies {
  articleService: ArticleService
  wsServer: WSServer
  http: HttpServerFastify
  cache: Cache
}

export class ArticleController {
  protected readonly logger = loggerNamespace('ArticleController')
  protected readonly deps: IDependencies

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.init().catch(this.logger.error)
  }

  private async init() {
    this.deps.wsServer.onRequest('article', 'get', this.actionWSGet)
    this.deps.http.route({ method: 'GET', path: '/article', handler: this.actionGet })
    this.deps.http.route({ method: 'GET', path: '/articleService/save', handler: this.actionSave })
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

  private actionGet = async (request: FastifyRequest, response: FastifyReply) => {
    this.logger.info(request.url)
    const result = await this.deps.articleService.findById(1)

    response.send({
      status: 'success',
      data: {
        article: result,
      },
    })
  }

  private actionSave = async () => {
    const factory = new EntityFactory(Article)
    const item = await factory.create({
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
