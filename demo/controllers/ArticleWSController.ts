import { IConnection, WSServer } from '../../core/ws/WSServer'
import { WSRequest } from '../../core/ws/WSRequest'
import { loggerNamespace } from '../../core/logger/logger'
import { ArticleService } from '../modules/article/ArticleService'

interface IConnectionState {
  token: string
}

interface IAppConnection extends IConnection<IConnectionState> {}

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
  }

  public actionReplace = async (request: WSRequest, connection: IAppConnection) => {
    const { text, author } = request.payload

    const result = this.deps.articleService.replaceAuthor(text, author)

    return {
      status: 'success',
      data: {
        result,
      },
    }
  }

  public actionAuthorList = async (request: WSRequest, connection: IAppConnection) => {
    const { itemsPerPage } = request.payload

    const result = this.deps.articleService.getAuthorList(itemsPerPage)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  public actionFetchList = async (request: WSRequest, connection: IConnection<any>) => {
    return {
      success: true,
    }
  }

  protected init(): void {
    this.deps.wsServer.onRequest('article', 'replace', this.actionReplace)
    this.deps.wsServer.onRequest('article', 'authors', this.actionAuthorList)
    this.deps.wsServer.onRequest('article', 'fetch-list', this.actionFetchList)
  }
}
