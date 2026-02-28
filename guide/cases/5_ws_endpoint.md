# Websocket endpoint (Controller)

[back](../wizard.md)

For creation websocket endpoint we need Websocket server to be added and started in application.

As a built-in Websocket server we use [websockets/ws](https://github.com/websockets/ws) but it could be <b>any favorite Websocket server</b>.

1. Open [App.ts](../../demo/App.ts)

2. Add Websocket server initialization

```ts
    import { WSServer } from '@cleverjs/backend/core/ws/WSServer'
    import { HttpServerFactory, THttpServer } from '@cleverjs/backend/http'
    import { loggerNamespace } from '@cleverjs/backend/core/logger/logger'

    export class App {
      protected readonly logger = loggerNamespace('App')
      protected readonly httpServer
      protected readonly wsServer: WSServer

      public constructor() {
        const websocketOptions = {
          port: 8080,
          keepalive: 60 * 1000, // Check that connection is alive every 60 seconds
          path: '/ws',
        }

        const httpServerFactory = new HttpServerFactory()
        this.httpServer = httpServerFactory.get(THttpServer.fastify, { port: 8080, host: 'localhost' })
        this.httpServer.start().catch(this.logger.error)
        this.wsServer = new WSServer(websocketOptions, this.httpServer.getInstance().server)
      }

      // This will be called on process finish and terminate ws and http server
      public destroy() {
        return async (): Promise<void> => {
          await this.wsServer.destroy()
          await this.httpServer.destroy()
        }
      }
    }
```

3. Websocket is available on ws://localhost:8080/ws now.

4. Create controller ```app/controllers/ArticleWSController.ts```

```ts
    import { IConnectionInfo, WSServer } from '@cleverjs/backend/core/ws/WSServer'
    import { WSRequest } from '@cleverjs/backend/core/ws/WSRequest'
    import { loggerNamespace } from '@cleverjs/backend/core/logger/logger'
    import { ArticleService } from '../modules/article/ArticleService'

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

      public actionReplace = async (request: WSRequest, connectionInfo: IConnectionInfo) => {
        const { text, author } = request.payload

        const result = this.deps.articleService.replaceAuthor(text, author)

        return {
          status: 'success',
          data: {
            result,
          },
        }
      }

      public actionAuthorList = async (request: WSRequest, connectionInfo: IConnectionInfo) => {
        const { limit } = request.payload

        const result = this.deps.articleService.getAuthorList(limit)

        return {
          success: true,
          data: {
            result,
          },
        }
      }

      protected init(): void {
        this.deps.wsServer.onRequest('article', 'replace', this.actionReplace)
        this.deps.wsServer.onRequest('article', 'authors', this.actionAuthorList)
      }
    }
```

5. Now we should initialize this controller in [App.ts](../../demo/App.ts)

```ts
    import { HttpServerFactory, THttpServer } from '@cleverjs/backend/http'
    import { WSServer } from '@cleverjs/backend/core/ws/WSServer'
    import { logger } from '@cleverjs/backend/core/logger/logger'
    import { ArticleService } from './app/modules/article/ArticleService'
    import { ArticleWSController } from './controllers/ArticleWSController'

    export class App {
      protected readonly httpServer
      protected readonly wsServer: WSServer

      public constructor() {
        const websocketOptions = {
          port: 8080,
          keepalive: 60 * 1000, // Check that connection is alive every 60 seconds
          path: '/ws',
        }

        const httpServerFactory = new HttpServerFactory()
        this.httpServer = httpServerFactory.get(THttpServer.fastify, { port: 8080, host: 'localhost' })
        this.httpServer.start().catch(logger.error)
        this.wsServer = new WSServer(websocketOptions, this.httpServer.getInstance().server)

        // Controller initialization
        new ArticleWSController({
          wsServer: this.wsServer,
          articleService: new ArticleService(),
        })
      }

      // This will be called on process finish and terminate ws and http server
      public destroy() {
        return async (): Promise<void> => {
          await this.wsServer.destroy()
          await this.httpServer.destroy()
        }
      }
    }
```

6. Frontend could access endpoints now.

Example

```ts
    import { v4 as uuidV4 } from 'uuid'

    const ws = new WebSocket('ws://localhost:8080/ws')

    const messageReplace = {
      header: {
        uuid: uuidV4(),
        service: 'article',
        action: 'replace',
      },

      payload: {
        text: 'This is {{author}} text',
        author: 'L. Euler',
      },
    }

    ws.send(messageReplace)

    const messageAuthorList = {
      header: {
        uuid: uuidV4(),
        service: 'article',
        action: 'authors',
      },

      payload: {
        limit: 2,
      },
    }

    ws.send(messageAuthorList)
```

7. Pay attention on request object

```ts
    interface IRequestHeader {
      uuid: string
      service: string
      action: string
    }

    interface TRequest {
      header: IRequestHeader
      payload: Record<string, any>
    }
```

7. Pay attention on response object

```ts
    interface IResponseHeader {
      uuid: string
      type: ResponseType
    }

    interface TResponse {
      header: IResponseHeader
      payload: TResponsePayload
      error?: string
    }
```

You may have a look at our frontend ws client [WSClient.ts](../../core/ws/WSClient.ts)

The next step is to operate with [Database](./6_database.md)

[back](../wizard.md)
