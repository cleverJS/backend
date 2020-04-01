import { HttpServer } from '../../../core/http/HttpServer'
import { logger } from '../../../core/logger/logger'
import { ArticleService } from './ArticleService'
import { ServerResponse } from 'http'
import { FastifyReply, FastifyRequest } from 'fastify'
import { IConnection, WSServer } from '../../../core/ws/WSServer'
import { WSRequest } from '../../../core/ws/WSRequest'
import { Article } from './Article'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { WSResponse } from '../../../core/ws/WSResponse'

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

  // @ts-ignore
  public handleWSTest = async (request: WSRequest, connection: IConnection) => {
    return this.actionWSTest(request)
  }

  // @ts-ignore
  public actionWSTest = async (request: WSRequest) => {
    this.deps.wsServer
      .broadcast(() => {
        return Promise.resolve(new WSResponse({ service: 'article', action: 'save', type: 'event' }, { item: 1 }))
      })
      .catch(logger.error)

    return {
      status: 'success',
    }
  }

  public actionWSGet = async (request: WSRequest) => {
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

  public actionGet = async (request: FastifyRequest, response: FastifyReply<ServerResponse>) => {
    logger.info(request)
    const factory = new EntityFactory(Article, Article.cast)

    response.send({
      status: 'success',
      data: {
        article: factory.create({
          title: 'News',
          author: 'Noname',
        }),
      },
    })
  }

  public actionSave = async () => {
    const factory = new EntityFactory(Article, Article.cast)
    const item = factory.create({
      title: 'hello',
    })

    const result = await this.deps.articleService.save(item)

    this.deps.wsServer
      .broadcast((connection : IConnection) => {
        if (connection.state.hasOwnProperty('token')) {
          return Promise.resolve(new WSResponse({ service: 'article', action: 'save', type: 'event' }, { item: result }))
        }

        return Promise.resolve(null)
      })
      .catch(logger.error)

    return {
      hello: 'Create item',
      collection: result,
    }
  }

  protected async init() {
    this.deps.wsServer.onRequest('article', 'test', this.handleWSTest)
    this.deps.wsServer.onRequest('article', 'get', this.actionWSGet)
    this.deps.wsServer.onRequest('article', 'update', this.actionWSGet)
    const instance = this.deps.http.getServer()
    instance.get('/article', this.actionGet)
    instance.get('/articleService/save', this.actionSave)
  }
}
