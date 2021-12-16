# HTTP endpoint (Controller)

[back](../wizard.md)

For creation HTTP endpoint we need HTTP server to be added and started in application.

As a built-in HTTP server we use [Fastify](https://github.com/fastify/fastify) but it could be <b>any favorite HTTP server</b>.

If your choice is [Fastify](https://github.com/fastify/fastify) then it will be good point to read their documentation. However, we will try to consider basic usage below.  

1. Open [App.ts](../../demo/App.ts)

2. Add HTTP server initialization

```ts
    import { HttpServer } from 'cleverJS/core/http/HttpServer'
    import { loggerNamespace } from 'cleverJS/core/logger/logger'
    
    export class App {
      protected readonly logger = loggerNamespace('App')
      protected readonly httpServer: HttpServer
    
      public constructor() {
        this.httpServer = new HttpServer({ port: 8080, host: 'localhost' })
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
    import { loggerNamespace } from 'cleverJS/core/logger/logger'
    import { HttpServer } from 'cleverJS/core/http/HttpServer'
    import { ArticleService } from '../modules/article/ArticleService'
    
    interface IDependencies {
      http: HttpServer
      articleService: ArticleService
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
    
        const result = this.deps.articleService.replaceAuthor(text, author)
    
        return {
          success: true,
          data: {
            result,
          },
        }
      }
    
      protected actionAuthorList = async (request: FastifyRequest) => {
        const { limit } = request.query as IAuthorQueryRequest
    
        const result = this.deps.articleService.getAuthorList(limit)
    
        return {
          success: true,
          data: {
            result,
          },
        }
      }
    
      protected init(): void {
        const instance = this.deps.http.getServer()
        instance.post('/api/article/replace', this.actionReplace)
        instance.get('/api/article/authors', this.actionAuthorList)
      }
    }
    
    interface IReplaceBodyRequest {
      text: string
      author: string
    }
    
    interface IAuthorQueryRequest {
      limit: number
    }
```

4. Now we should initialize this controller in [App.ts](../../demo/App.ts) 

```ts
    // Install and import fastify cors plugin
    import cors from 'fastify-cors'
    import { HttpServer } from 'cleverJS/core/http/HttpServer'
    import { loggerNamespace } from 'cleverJS/core/logger/logger'
    import { ArticleService } from './app/modules/article/ArticleService'
    import { ArticleHTTPController } from './controllers/ArticleHTTPController'
    
    export class App {
      protected readonly logger = loggerNamespace('App')
      protected readonly httpServer: HttpServer
    
      public constructor() {
        this.httpServer = new HttpServer({ port: 8080, host: 'localhost' })
        
        // Register fastify cors plugin
        this.registerFastifyPlugins()
        this.httpServer.start().catch(this.logger.error)
    
        // Controller initialization
        new ArticleHTTPController({
          http: this.httpServer,
          articleService: new ArticleService(),
        })
      }
    
      // This will be called on process finish and terminate http server
      public destroy() {
        return [() => this.httpServer.destroy()]
      }
   
      protected registerFastifyPlugins(): void {
        this.httpServer.getServer().register(cors, {
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

