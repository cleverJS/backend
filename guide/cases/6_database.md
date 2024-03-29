# Database

[back](../wizard.md)

Obviously we need to store persistent data somewhere. MySQL, Postgres, MSSQL, Oracle, SQLite are good place to go.

For working with Databases we prefer [Knex](https://github.com/knex/knex) package, because

- Convenient QueryBuilder
- Support main DBes
- Connection Pool inside
- Typescript support

Of course, you may use any favorite DB client directly, but then you will not be able to use core abstraction for working with a DB.

Knex config initialization [variants](http://knexjs.org/#Installation-client) for different DBes.

In this example we will use SQLite

1. Create `./knexfile.ts`

```ts
   import { Knex } from 'knex'
   import path from 'path'
 
   // Path where SQLite db file is  
   const dbPath = path.resolve('./runtime/db.sqlite')

   const config = {
     client: 'sqlite3',
     connection: {
       filename: dbPath,
     },
     useNullAsDefault: false,
   } as Knex.Config
 
   // Config for different environments   
   module.exports = {
     test: config,
     development: config,
     production: config,
   }
```

2. Initialize it in [App.ts](../../demo/App.ts)

```ts
   import knex, { Knex } from 'knex'
   import connections from '../knexfile'

   // Get connection config for environment    
   const knexConfig = (connections as any)[
     process.env.NODE_ENV || 'development'
   ] as Knex.Config

   export class App {
     protected readonly connection: Knex

     public constructor() {
       this.connection = knex(knexConfig)
     }

     // This will be called on process finish and DB connection
     public destroy() {
        return async (): Promise<void> => {
          await new Promise((resolve) => {
            this.connection.destroy(() => {
              resolve(true)
            })
            this.logger.info('DB connections closed')
          })
        }
     }
   }
```

3. Create resource `app/modules/Article/resource/ArticleResource.ts`

```ts
   import { Knex } from 'knex'

   export class ArticleResource {
     protected readonly connection: Knex

     public constructor(connection: Knex) {
       this.connection = connection
     }

     public async fetchAuthorList(limit: number): Promise<string[]> {
       const rows = await this.connection('article').limit(limit)
       return rows.map((i) => {
         i.author
       })
     }
   }
```

4. Since we have layer for handling with a DB we may change ArticleService.ts to use it.

```ts
   import { ArticleResource } from './resource/ArticleResource'

   export class ArticleService {
     protected readonly resource: ArticleResource

     public constructor(resource: ArticleResource) {
       this.resource = resource
     }

     public async getAuthorList(limit: number): Promise<string[]> {
       return this.resource.fetchAuthorList(limit)
     }

     public replaceAuthor(text: string, author: string): string {
       return text.replace('{{author}}', author)
     }
   }
```

At this point your [App.ts](../../demo/App.ts) should looks like this

```ts
import knex, { Knex } from 'knex'
import connections from '../knexfile'
import cors from 'fastify-cors'
import { HttpServer } from 'cleverJS/core/http/HttpServer'
import { WSServer } from 'cleverJS/core/ws/WSServer'
import { loggerNamespace } from 'cleverJS/core/logger/logger'
import { ArticleService } from './app/modules/article/ArticleService'
import { ArticleResource } from './app/modules/article/resource/ArticleResource'
import { ArticleWSController } from './controllers/ArticleWSController'
import { ArticleHTTPController } from './controllers/ArticleHTTPController'

// Get connection config for environment
const knexConfig = (connections as any)[
  process.env.NODE_ENV || 'development'
] as Knex.Config

export class App {
  protected readonly connection: Knex
  protected readonly httpServer: HttpServer
  protected readonly wsServer: WSServer
  protected readonly logger = loggerNamespace('App')

  public constructor() {
    const websocketOptions = {
      port: 8080,
      keepalive: 60 * 1000, // Check that connection is alive every 60 seconds
      path: '/ws',
    }

    this.httpServer = new HttpServer({ port: 8080, host: 'localhost' })
    // Register fastify cors plugin
    this.registerFastifyPlugins()
    this.httpServer.start().catch(this.logger.error)
    this.wsServer = new WSServer(
      websocketOptions,
      this.httpServer.getServer().server
    )

    // DB connection initialization
    this.connection = knex(knexConfig)

    const articleResource = new ArticleResource(this.connection)
    const articleService = new ArticleService(articleResource)

    // Controller initialization
    new ArticleHTTPController({
      articleService,
      http: this.httpServer,
    })

    new ArticleWSController({
      articleService,
      wsServer: this.wsServer,
    })
  }

  // This will be called on process finish and terminate ws/http server and DB connection
  public destroy() {
    return async (): Promise<void> => {
      await this.wsServer.destroy()
      await this.httpServer.destroy()
      await new Promise((resolve) => {
        this.connection.destroy(() => {
          resolve(true)
        })
        this.logger.info('DB connections closed')
      })
    }
  }

  protected registerFastifyPlugins(): void {
    this.httpServer.getServer().register(cors, {
      origin: true,
      credentials: true,
      allowedHeaders: [
        'Access-Control-Allow-Origin',
        'Access-Control-Allow-Headers',
        'authorization',
        'Content-Type',
      ],
    })
  }
}
```

The next step is [Entity](./7_entity.md) creation.

[back](../wizard.md)
