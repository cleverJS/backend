import { WSServer } from '../../core/ws/WSServer'
import { WSRequest } from '../../core/ws/WSRequest'
import { loggerNamespace } from '../../core/logger/logger'
import { ArticleService } from '../modules/article/ArticleService'
import { Paginator } from '../../core/utils/Paginator'
import { WSResponse } from '../../core/ws/WSResponse'
import { IAppConnection } from '../types/WSConnection'

interface IDependencies {
  wsServer: WSServer
  articleService: ArticleService
}

export class ArticleWSController {
  protected readonly deps: IDependencies
  protected readonly logger = loggerNamespace('ArticleWSController')

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.init()
    this.onEvents()
  }

  public actionReplace = async (request: WSRequest, connection: IAppConnection): Promise<Record<string, any>> => {
    const { text, author } = request.payload

    const result = this.deps.articleService.replaceAuthor(text, author)

    return {
      status: 'success',
      data: {
        result,
      },
    }
  }

  public actionAuthorList = async (request: WSRequest, connection: IAppConnection): Promise<Record<string, any>> => {
    const { page = 1, itemsPerPage } = request.payload

    const paginator = new Paginator()
    paginator.setItemsPerPage(itemsPerPage)
    paginator.setCurrentPage(page)

    const result = await this.deps.articleService.fetchAuthorList(paginator)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  public actionFetchList = async (request: WSRequest, connection: IAppConnection): Promise<Record<string, any>> => {
    const { page = 1, itemsPerPage } = request.payload

    const paginator = new Paginator()
    paginator.setItemsPerPage(itemsPerPage)
    paginator.setCurrentPage(page)

    const result = await this.deps.articleService.list(paginator)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  public actionSubscribe = async (request: WSRequest, connection: IAppConnection): Promise<Record<string, any>> => {
    connection.state.subscriptions.article = true

    return {
      success: true,
    }
  }

  protected onEvents(): void {
    this.deps.articleService.eventEmitter.on('new', (item) => {
      this.deps.wsServer.broadcast((connection: IAppConnection) => {
        return new Promise((resolve) => {
          let result = null
          if (connection.state.subscriptions.article) {
            result = WSResponse.createEventResponse('article:new', { data: item })
          }

          resolve(result)
        })
      })
    })
  }

  protected init(): void {
    this.deps.wsServer.onRequest('article', 'subscribe', this.actionSubscribe)
    this.deps.wsServer.onRequest('article', 'replace', this.actionReplace)
    this.deps.wsServer.onRequest('article', 'authors', this.actionAuthorList)
    this.deps.wsServer.onRequest('article', 'fetch-list', this.actionFetchList)
  }
}
