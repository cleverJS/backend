import { ArticleService } from './ArticleService'
import { WSServer } from '../../../core/ws/WSServer'
import { WSRequest } from '../../../core/ws/WSRequest'

interface IDependencies {
  articleService: ArticleService
  wsServer: WSServer
}

export class ArticleController {
  protected readonly deps: IDependencies

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.init()
  }

  // @ts-ignore
  public actionWSTest = async (request: WSRequest) => {
    return {
      status: 'success',
    }
  }

  // @ts-ignore
  public actionWSTest2 = async (request: WSRequest) => {
    return {
      status: 'success',
    }
  }

  protected init() {
    this.deps.wsServer.onRequest('article', 'test', this.actionWSTest)
    this.deps.wsServer.onRequest('article', 'test2', this.actionWSTest2)
  }
}
