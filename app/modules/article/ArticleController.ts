import { v4 as uuid4 } from 'uuid'
import { ArticleService } from './ArticleService'
import { IConnection, WSServer } from '../../../core/ws/WSServer'
import { WSRequest } from '../../../core/ws/WSRequest'
import { sleep } from '../../../core/utils/sleep'
import { logger } from '../../../core/logger/logger'
import { WSResponse } from '../../../core/ws/WSResponse'

interface IConnectionState {
  token: string
}

interface IAppConnection extends IConnection<IConnectionState> {}

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

    this.deps.wsServer.broadcast(async (con) => {
      logger.info(`Broadcast to ${con.state.id}`)
      return new WSResponse({ uuid: uuid4(), service: 'broadcast', action: 'test', type: 'event' }, { date: new Date() })
    })

    return {
      status: 'success',
    }
  }

  // @ts-ignore
  public actionWSTest2 = async (request: WSRequest, connection: IConnection) => {
    // const schema = new jsBinary.Type({
    //   status: 'string',
    //   data: {
    //     items: [
    //       {
    //         o: 'float',
    //         h: 'float',
    //         l: 'float',
    //         c: 'float',
    //         v: 'float',
    //         t: 'uint',
    //       },
    //     ],
    //   },
    // })

    return this.getPayload()
  }

  protected init() {
    this.deps.wsServer.onRequest('article', 'test', this.actionWSTest)
    this.deps.wsServer.onRequest('article', 'test2', this.actionWSTest2)

    this.deps.wsServer.onDisconnect((state: IConnectionState) => {
      console.log(state.token)
    })
  }

  protected getPayload() {
    return {
      status: 'success',
      data: {
        items: [
          {
            o: 144.7,
            h: 145.41,
            l: 143.98,
            c: 144.19,
            v: 77978,
            t: 1603911600,
          },
          {
            o: 144.21,
            h: 144.5,
            l: 143.38,
            c: 144.5,
            v: 120100,
            t: 1603915200,
          },
          {
            o: 146.89,
            h: 146.89,
            l: 144.5,
            c: 144.5,
            v: 5,
            t: 1603918800,
          },
          {
            o: 144.2,
            h: 145.99,
            l: 144.2,
            c: 145.87,
            v: 15,
            t: 1603954800,
          },
          {
            o: 145.01,
            h: 145.68,
            l: 145,
            c: 145.68,
            v: 3,
            t: 1603965600,
          },
          {
            o: 145,
            h: 145,
            l: 144.26,
            c: 144.26,
            v: 58,
            t: 1603969200,
          },
          {
            o: 144.71,
            h: 144.72,
            l: 144.04,
            c: 144.04,
            v: 9,
            t: 1603972800,
          },
          {
            o: 144.5,
            h: 146.02,
            l: 142.51,
            c: 143.92,
            v: 55471,
            t: 1603976400,
          },
          {
            o: 143.76,
            h: 144.29,
            l: 140.98,
            c: 142.67,
            v: 66656,
            t: 1603980000,
          },
          {
            o: 142.74,
            h: 143.9,
            l: 142.19,
            c: 142.48,
            v: 34932,
            t: 1603983600,
          },
          {
            o: 142.67,
            h: 143.24,
            l: 141.75,
            c: 141.92,
            v: 30782,
            t: 1603987200,
          },
          {
            o: 141.9,
            h: 142.86,
            l: 141.76,
            c: 141.91,
            v: 21317,
            t: 1603990800,
          },
          {
            o: 141.98,
            h: 143.02,
            l: 141.9,
            c: 142.19,
            v: 48574,
            t: 1603994400,
          },
          {
            o: 142.21,
            h: 143.75,
            l: 142.1,
            c: 142.56,
            v: 101367,
            t: 1603998000,
          },
          {
            o: 142.56,
            h: 142.56,
            l: 142.1,
            c: 142.1,
            v: 65639,
            t: 1604001600,
          },
          {
            o: 143.5,
            h: 143.5,
            l: 143.5,
            c: 143.5,
            v: 1,
            t: 1604005200,
          },
          {
            o: 141.01,
            h: 141.01,
            l: 139.85,
            c: 139.85,
            v: 7,
            t: 1604041200,
          },
          {
            o: 140.98,
            h: 142.72,
            l: 140.98,
            c: 141.51,
            v: 11,
            t: 1604044800,
          },
          {
            o: 141.3,
            h: 141.3,
            l: 141.03,
            c: 141.03,
            v: 6,
            t: 1604048400,
          },
          {
            o: 141.76,
            h: 141.76,
            l: 141.61,
            c: 141.61,
            v: 3,
            t: 1604055600,
          },
          {
            o: 141,
            h: 142,
            l: 141,
            c: 142,
            v: 60,
            t: 1604059200,
          },
          {
            o: 140,
            h: 141.63,
            l: 137.4,
            c: 137.7,
            v: 63255,
            t: 1604062800,
          },
          {
            o: 137.7,
            h: 138.69,
            l: 133.84,
            c: 134.01,
            v: 83295,
            t: 1604066400,
          },
          {
            o: 133.95,
            h: 135.44,
            l: 133.93,
            c: 135.22,
            v: 50040,
            t: 1604070000,
          },
          {
            o: 135.19,
            h: 137.77,
            l: 134.95,
            c: 136.13,
            v: 45952,
            t: 1604073600,
          },
          {
            o: 136.22,
            h: 136.53,
            l: 134.5,
            c: 135.06,
            v: 39235,
            t: 1604077200,
          },
          {
            o: 135.04,
            h: 136.16,
            l: 134.35,
            c: 135.9,
            v: 54944,
            t: 1604080800,
          },
          {
            o: 135.82,
            h: 136.43,
            l: 134.9,
            c: 135.81,
            v: 93827,
            t: 1604084400,
          },
          {
            o: 135.75,
            h: 135.75,
            l: 134.01,
            c: 134.01,
            v: 73942,
            t: 1604088000,
          },
          {
            o: 136.17,
            h: 136.17,
            l: 136.17,
            c: 136.17,
            v: 1,
            t: 1604095200,
          },
          {
            o: 144.7,
            h: 145.41,
            l: 143.98,
            c: 144.19,
            v: 77978,
            t: 1603911600,
          },
          {
            o: 144.21,
            h: 144.5,
            l: 143.38,
            c: 144.5,
            v: 120100,
            t: 1603915200,
          },
          {
            o: 146.89,
            h: 146.89,
            l: 144.5,
            c: 144.5,
            v: 5,
            t: 1603918800,
          },
          {
            o: 144.2,
            h: 145.99,
            l: 144.2,
            c: 145.87,
            v: 15,
            t: 1603954800,
          },
          {
            o: 145.01,
            h: 145.68,
            l: 145,
            c: 145.68,
            v: 3,
            t: 1603965600,
          },
          {
            o: 145,
            h: 145,
            l: 144.26,
            c: 144.26,
            v: 58,
            t: 1603969200,
          },
          {
            o: 144.71,
            h: 144.72,
            l: 144.04,
            c: 144.04,
            v: 9,
            t: 1603972800,
          },
          {
            o: 144.5,
            h: 146.02,
            l: 142.51,
            c: 143.92,
            v: 55471,
            t: 1603976400,
          },
          {
            o: 143.76,
            h: 144.29,
            l: 140.98,
            c: 142.67,
            v: 66656,
            t: 1603980000,
          },
          {
            o: 142.74,
            h: 143.9,
            l: 142.19,
            c: 142.48,
            v: 34932,
            t: 1603983600,
          },
          {
            o: 142.67,
            h: 143.24,
            l: 141.75,
            c: 141.92,
            v: 30782,
            t: 1603987200,
          },
          {
            o: 141.9,
            h: 142.86,
            l: 141.76,
            c: 141.91,
            v: 21317,
            t: 1603990800,
          },
          {
            o: 141.98,
            h: 143.02,
            l: 141.9,
            c: 142.19,
            v: 48574,
            t: 1603994400,
          },
          {
            o: 142.21,
            h: 143.75,
            l: 142.1,
            c: 142.56,
            v: 101367,
            t: 1603998000,
          },
          {
            o: 142.56,
            h: 142.56,
            l: 142.1,
            c: 142.1,
            v: 65639,
            t: 1604001600,
          },
          {
            o: 143.5,
            h: 143.5,
            l: 143.5,
            c: 143.5,
            v: 1,
            t: 1604005200,
          },
          {
            o: 141.01,
            h: 141.01,
            l: 139.85,
            c: 139.85,
            v: 7,
            t: 1604041200,
          },
          {
            o: 140.98,
            h: 142.72,
            l: 140.98,
            c: 141.51,
            v: 11,
            t: 1604044800,
          },
          {
            o: 141.3,
            h: 141.3,
            l: 141.03,
            c: 141.03,
            v: 6,
            t: 1604048400,
          },
          {
            o: 141.76,
            h: 141.76,
            l: 141.61,
            c: 141.61,
            v: 3,
            t: 1604055600,
          },
          {
            o: 141,
            h: 142,
            l: 141,
            c: 142,
            v: 60,
            t: 1604059200,
          },
          {
            o: 140,
            h: 141.63,
            l: 137.4,
            c: 137.7,
            v: 63255,
            t: 1604062800,
          },
          {
            o: 137.7,
            h: 138.69,
            l: 133.84,
            c: 134.01,
            v: 83295,
            t: 1604066400,
          },
          {
            o: 133.95,
            h: 135.44,
            l: 133.93,
            c: 135.22,
            v: 50040,
            t: 1604070000,
          },
          {
            o: 135.19,
            h: 137.77,
            l: 134.95,
            c: 136.13,
            v: 45952,
            t: 1604073600,
          },
          {
            o: 136.22,
            h: 136.53,
            l: 134.5,
            c: 135.06,
            v: 39235,
            t: 1604077200,
          },
          {
            o: 135.04,
            h: 136.16,
            l: 134.35,
            c: 135.9,
            v: 54944,
            t: 1604080800,
          },
          {
            o: 135.82,
            h: 136.43,
            l: 134.9,
            c: 135.81,
            v: 93827,
            t: 1604084400,
          },
          {
            o: 135.75,
            h: 135.75,
            l: 134.01,
            c: 134.01,
            v: 73942,
            t: 1604088000,
          },
          {
            o: 136.17,
            h: 136.17,
            l: 136.17,
            c: 136.17,
            v: 1,
            t: 1604095200,
          },
        ],
      },
    }
  }
}
