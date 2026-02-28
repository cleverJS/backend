# HTTP endpoint (Controller)

[back](../wizard.md)

For creation HTTP endpoint we need HTTP server to be added and started in application.

As a built-in HTTP server we use [Fastify](https://github.com/fastify/fastify) but it could be <b>any favorite HTTP server</b>.

If your choice is [Fastify](https://github.com/fastify/fastify) then it will be good point to read their documentation. However, we will try to consider basic usage below.

1. Open [App.ts](../../demo/App.ts)

2. Add HTTP server initialization

```ts
    import { HttpServerFactory, THttpServer } from '@cleverjs/backend/http'
    import { loggerNamespace } from '@cleverjs/backend/core/logger/logger'

    export class App {
      protected readonly logger = loggerNamespace('App')
      protected readonly httpServer

      public constructor() {
        const httpServerFactory = new HttpServerFactory()
        this.httpServer = httpServerFactory.get(THttpServer.fastify, { port: 8080, host: 'localhost' })
        this.httpServer.start().catch(this.logger.error)
      }

      // This will be called on process finish and terminate http server
      public destroy() {
        return async (): Promise<void> => {
          await this.httpServer.destroy()
        }
      }
    }
```

3. Create controller ```app/controllers/ArticleHTTPController.ts```

```ts
    import { FastifyRequest } from 'fastify'
    import { loggerNamespace } from '@cleverjs/backend/core/logger/logger'
    import { HttpServerFastify } from '@cleverjs/backend/core/http/servers/HttpServerFastify'
    import { ArticleService } from '../modules/article/ArticleService'

    interface IDependencies {
      http: HttpServerFastify
      service: ArticleService
    }

    export class ArticleHTTPController {
      protected readonly logger = loggerNamespace('ArticleHTTPController')
      protected readonly deps: IDependencies

      public constructor(deps: IDependencies) {
        this.deps = deps
        this.init()
      }

      protected actionReplace = async (request: FastifyRequest) => {
        const { text, author } = request.body as IReplaceBodyRequest

        const result = this.deps.service.replaceAuthor(text, author)

        return {
          success: true,
          data: {
            result,
          },
        }
      }

      protected actionAuthorList = async (request: FastifyRequest) => {
        const { page, itemsPerPage } = request.query as IAuthorQueryRequest

        const paginator = new Paginator()
        paginator.setItemsPerPage(itemsPerPage)
        paginator.setCurrentPage(page)

        const result = await this.deps.service.fetchAuthorList(paginator)

        return {
          success: true,
          data: {
            result,
          },
        }
      }

      protected init(): void {
        this.deps.http.route({ method: 'POST', path: '/api/article/replace', handler: this.actionReplace })
        this.deps.http.route({ method: 'GET', path: '/api/article/authors', handler: this.actionAuthorList })
      }
    }

    interface IReplaceBodyRequest {
      text: string
      author: string
    }

    interface IAuthorQueryRequest {
      page: number
      itemsPerPage: number
    }
```

4. Now we should initialize this controller in [App.ts](../../demo/App.ts)

```ts
    // Install and import fastify cors plugin
    import cors from '@fastify/cors'
    import { HttpServerFactory, THttpServer } from '@cleverjs/backend/http'
    import { loggerNamespace } from '@cleverjs/backend/core/logger/logger'
    import { ArticleService } from './app/modules/article/ArticleService'
    import { ArticleHTTPController } from './controllers/ArticleHTTPController'

    export class App {
      protected readonly logger = loggerNamespace('App')
      protected readonly httpServer

      public constructor() {
        const httpServerFactory = new HttpServerFactory()
        this.httpServer = httpServerFactory.get(THttpServer.fastify, { port: 8080, host: 'localhost' })

        // Register fastify cors plugin
        this.registerFastifyPlugins()
        this.httpServer.start().catch(this.logger.error)

        // Controller initialization
        new ArticleHTTPController({
          http: this.httpServer,
          service: new ArticleService(),
        })
      }

      // This will be called on process finish and terminate http server
      public destroy() {
        return async (): Promise<void> => {
          await this.httpServer.destroy()
        }
      }

      protected registerFastifyPlugins(): void {
        this.httpServer.getInstance().register(cors, {
          origin: true,
          credentials: true,
          allowedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'authorization', 'Content-Type'],
        })
      }
    }
```

5. Frontend could access enpoints now.

    - POST http://localhost:8080/api/article/replace
    - GET http://localhost:8080/api/article/authors

The next step is to operate with [Database](./6_database.md)

[back](../wizard.md)
