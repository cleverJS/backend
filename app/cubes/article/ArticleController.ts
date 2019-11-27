import { HttpServer } from '../../../core/http/HttpServer'
import { logger } from '../../../core/logger/logger'
import { ArticleService } from './ArticleService'
import { ServerResponse } from 'http'
import { FastifyReply, FastifyRequest } from 'fastify'
import { WSServer } from '../../../core/ws/WSServer'
import { WSRequest } from '../../../core/ws/WSRequest'
import { Article } from './Article'
import { EntityFactory } from '../../../core/entity/EntityFactory'

interface IDependencies {
  articleService: ArticleService
  wsServer: WSServer
  http: HttpServer
}

export class ArticleController {
  protected readonly deps: IDependencies

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.init().catch(logger.error)
  }

  private async init() {
    this.deps.wsServer.onRequest('article', 'get', this.actionWSGet)
    this.deps.wsServer.onRequest('article', 'update', this.actionWSGet)
    const instance = this.deps.http.getServer()
    instance.get('/article', this.actionGet)
    instance.get('/articleService/save', this.actionSave)
  }

  private actionWSGet = async (request: WSRequest) => {
    logger.info(request)
    const factory = new EntityFactory(Article, Article.cast)
    return {
      status: 'success',
      data: {
        article: factory.create({
          title: 'News',
          author: 'Noname',
        }),
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
