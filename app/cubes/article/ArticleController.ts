import { ArticleService } from './ArticleService'
import { IConnection, WSServer } from "../../../core/ws/WSServer";
import { WSRequest } from '../../../core/ws/WSRequest'
import { sleep } from "../../../core/utils/sleep";
import { logger } from "../../../core/logger/logger";
import { WSResponse } from "../../../core/ws/WSResponse";
import { v4 as uuid4 } from "uuid";

interface IConnectionState {
  token: string
}

interface IAppConnection extends IConnection<IConnectionState> {
}

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
  public actionWSTest = async (request: WSRequest, connection: IAppConnection) => {
    await sleep(2000)

    this.deps.wsServer.broadcast(async (connection: IAppConnection) => {
      logger.info(`Broadcast to ${connection.id}`)
      return new WSResponse({ uuid: uuid4(), service: 'broadcast', action: 'test', type: 'event' }, { date: new Date() })
    })

    return {
      status: 'success',
    }
  }

  // @ts-ignore
  public actionWSTest2 = async (request: WSRequest, connection: IConnection) => {
    await sleep(500)
    return {
      status: 'success',
    }
  }

  protected init() {
    this.deps.wsServer.onRequest('article', 'test', this.actionWSTest)
    this.deps.wsServer.onRequest('article', 'test2', this.actionWSTest2)
  }
}
