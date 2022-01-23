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
import { AbstractCRUDController } from './AbstractCRUDController'

interface IArticleReplacePayload {
  text: string
  author: string
}

interface IArticleAuthorPayload {
  page: number
  itemsPerPage: number
}

export class ArticleWSController extends AbstractCRUDController<ArticleService> {
  protected readonly logger = loggerNamespace('ArticleWSController')

  public constructor(wsServer: WSServer, service: ArticleService) {
    super(wsServer, service, 'article')
    this.onWSConnect()
    this.onEvents()
  }

  @route('article', 'replace')
  public actionReplace = async (request: WSRequest<IArticleReplacePayload>, connection: IAppConnectionInfo): Promise<Record<string, any>> => {
    const { text, author } = request.payload

    const result = this.service.replaceAuthor(text, author)

    return {
      status: 'success',
      data: {
        result,
      },
    }
  }

  @route('article', 'author')
  public actionAuthorList = async (request: WSRequest<IArticleAuthorPayload>, connection: IAppConnectionInfo): Promise<Record<string, any>> => {
    const { page = 1, itemsPerPage } = request.payload

    const paginator = new Paginator()
    paginator.setItemsPerPage(itemsPerPage)
    paginator.setCurrentPage(page)

    const result = await this.service.fetchAuthorList(paginator)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  @route('article', 'test')
  public actionTest = async (request: WSRequest, connection: IAppConnectionInfo): Promise<Record<string, any>> => {
    return {
      success: true,
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

  protected onWSConnect() {
    this.wsServer.onConnect(async (client: WebSocket) => {
      const connection = this.wsServer.connectionInfoMap.get(client)
      if (connection) {
        connection.state.subscriptions = {
          article: false,
        }
      }
    })
  }

  protected onEvents(): void {
    this.service.eventEmitter.on('new', (item) => {
      this.wsServer.broadcast(async (connection: IAppConnectionInfo) => {
        let result = null
        if (connection.state.subscriptions.article) {
          result = WSResponse.createEventResponse('article:new', { data: item })
        }

        return result
      })
    })
  }
}
