import { WebSocket } from 'ws'
import { randomInt } from 'crypto'
import { WSServer } from '../../core/ws/WSServer'
import { WSRequest } from '../../core/ws/WSRequest'
import { loggerNamespace } from '../../core/logger/logger'
import { ArticleService } from '../modules/article/ArticleService'
import { Paginator } from '../../core/utils/Paginator'
import { WSResponse } from '../../core/ws/WSResponse'
import { IAppConnectionInfo } from '../types/WSConnection'
import { route } from '../../core/decorators/routes'
import { sleep } from '../../core/utils/sleep'

interface IDependencies {
  wsServer: WSServer
  articleService: ArticleService
}

export class ArticleWSController {
  protected readonly deps: IDependencies
  protected readonly logger = loggerNamespace('ArticleWSController')

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.onEvents()

    this.deps.wsServer.onConnect(async (client: WebSocket) => {
      const connection = this.deps.wsServer.connectionInfoMap.get(client)
      if (connection) {
        connection.state.subscriptions = {
          article: false,
        }
      }
    })
  }

  @route('article', 'replace')
  public actionReplace = async (request: WSRequest, connection: IAppConnectionInfo): Promise<Record<string, any>> => {
    const { text, author } = request.payload

    const result = this.deps.articleService.replaceAuthor(text, author)

    return {
      status: 'success',
      data: {
        result,
      },
    }
  }

  @route('article', 'author')
  public actionAuthorList = async (request: WSRequest, connection: IAppConnectionInfo): Promise<Record<string, any>> => {
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

  @route('article', 'fetch-list')
  public actionFetchList = async (request: WSRequest, connection: IAppConnectionInfo): Promise<Record<string, any>> => {
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

  @route('article', 'subscribe')
  public actionSubscribe = async (request: WSRequest, connection: IAppConnectionInfo): Promise<Record<string, any>> => {
    connection.state.subscriptions.article = true

    return {
      success: true,
    }
  }

  @route('article', 'sleep')
  public actionSleep = async (request: WSRequest, connection: IAppConnectionInfo): Promise<Record<string, any>> => {
    await sleep(randomInt(1, 2) * 1000)

    return {
      success: true,
    }
  }

  protected onEvents(): void {
    this.deps.articleService.eventEmitter.on('new', (item) => {
      this.deps.wsServer.broadcast(async (connection: IAppConnectionInfo) => {
        let result = null
        if (connection.state.subscriptions.article) {
          result = WSResponse.createEventResponse('article:new', { data: item })
        }

        return result
      })
    })
  }
}
