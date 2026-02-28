# Abstraction (DBEntityResource, DBKnexResource, AbstractService, Condition)

[back](../wizard.md)

Mostly, a lot of queries are simple when operating with a database and could be covered
with the following methods with some elementary conditions in parameters:

- findById - return record by primary key
- findOne - return one record by elementary conditions
- findAll - return all records by elementary conditions
- save - save data
- delete - delete data by elementary conditions
- truncate - truncate table
- list - return records with limit/offset by elementary conditions

The following abstractions allow to do this

- [DBKnexResource](../../core/db/sql/DBKnexResource.ts) - low-level Knex-based resource implementing [IDBResource](../../core/db/sql/IDBResource.ts)
- [DBEntityResource](../../core/db/sql/DBEntityResource.ts) - entity-aware resource that wraps `DBKnexResource` and handles entity creation/mapping
- [AbstractService](../../core/AbstractService.ts) - abstraction for business logic for operating with DB
- [Condition](../../core/db/Condition.ts) - abstraction for elementary DB conditions which could be parsed into DB <b>WHERE</b> expression

## Condition

First of all we need to start from [Condition](../../core/db/Condition.ts)

It has the following interface:

```ts
export enum TConditionOperator {
  EQUALS,
  NOT_EQUALS,
  LESS_THAN,
  GREATER_THAN,
  LESS_OR_EQUALS,
  GREATER_OR_EQUALS,
  BETWEEN,
  NOT_BETWEEN,
  LIKE,
  ILIKE,
  NOT_LIKE,
  IN,
  NOT_IN,
  IS_NULL,
  IS_NOT_NULL,
}

export type TConditionLogic = 'and' | 'or'

export interface IConditionItemList {
  logic?: TConditionLogic
  conditions: (IConditionItem | IConditionItemList)[]
}

// IConditionItem is a discriminated union type:
export type IConditionItem = TConditionSimple | TConditionBetween | TConditionIN | TConditionLike | TConditionNull
```

This allows us to describe <b>WHERE</b> expression as abstraction.

```ts
const condition = new Condition({
  conditions: [{ operator: TConditionOperator.EQUALS, field: 'a', value: 1 }],
})

//  where (`a` = 1)
```

```ts
const condition = new Condition({
  conditions: [{ operator: TConditionOperator.NOT_EQUALS, field: 'a', value: 1 }],
})

//  where (`a` <> 1)
```

```ts
const condition = new Condition({
  conditions: [{ operator: TConditionOperator.LIKE, field: 'a', value: '%abc%' }],
})

//  where (`a` LIKE '%abc%')
```

```ts
const condition = new Condition({
  conditions: [{ operator: TConditionOperator.IS_NULL, field: 'a' }],
})

//  where (`a` IS NULL)
```

```ts
const condition = new Condition({
  conditions: [{ operator: TConditionOperator.LESS_THAN, field: 'a', value: 1 }],
})

//  where (`a` < 1)
```

```ts
const condition = new Condition({
  logic: 'or',
  conditions: [
    { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
    { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
  ],
})

// where (`a` = 1 or `b` = 2)
```

```ts
const condition = new Condition({
  logic: 'and',
  conditions: [
    { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
    { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
  ],
})

// where (`a` = 1 and `b` = 2)
```

```ts
const condition = new Condition({
  logic: 'or',
  conditions: [
    {
      logic: 'or',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    },
    {
      logic: 'and',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'c', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'd', value: 2 },
      ],
    },
    { operator: TConditionOperator.EQUALS, field: 'e', value: 1 },
  ],
})

// where ((`a` = 1 or `b` = 2) or (`c` = 1 and `d` = 2) or `e` = 1)
```

```ts
const condition = new Condition({
  logic: 'and',
  conditions: [
    {
      logic: 'or',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    },
    {
      logic: 'and',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'c', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'd', value: 2 },
      ],
    },
  ],
})

// where ((`a` = 1 or `b` = 2) and (`c` = 1 and `d` = 2))
```

## AbstractService

With the help of Condition and AbstractService we could extend ArticleService and implement simple business logic

```ts
import { AbstractService } from '@cleverjs/backend/core/AbstractService'
import { Condition, TConditionOperator } from '@cleverjs/backend/core/db/Condition'
import { Article } from './Article'
import { ArticleEntityResource } from './resource/ArticleEntityResource'

// Article service is extended with AbstractService
export class ArticleService extends AbstractService<Article, ArticleEntityResource> {
  // This method uses condition and inherited findOne
  public async findByAuthor(author: string): Promise<Article | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
    return this.resource.findOne(condition)
  }

  public async getAuthorList(itemsPerPage: number): { items: string[]; total: number } {
    // This inherited count
    const total = await this.count()
    return {
      total,
      items: ['G. M. Fikhtengolts', 'L. Euler', 'J. L. Lagrange'].slice(0, itemsPerPage)
    }
  }

  public replaceAuthor(text: string, author: string): string {
    return text.replace('{{author}}', author)
  }
}
```

## DBEntityResource + DBKnexResource

The resource layer is split into two classes:

- `DBKnexResource` — low-level SQL operations using Knex (implements `IDBResource`)
- `DBEntityResource` — entity-aware wrapper that uses `DBKnexResource` and `EntityFactory`

ArticleEntityResource should extend `DBEntityResource`:

```ts
import { DBEntityResource } from '@cleverjs/backend/core/db/sql/DBEntityResource'
import { Article } from '../Article'

export class ArticleEntityResource extends DBEntityResource<Article> {
}
```

Module initialization brings the pieces together:

```ts
import { Knex } from 'knex'
import { ConditionDbParser } from '@cleverjs/backend/core/db/sql/condition/ConditionDbParser'
import { DBKnexResource } from '@cleverjs/backend/core/db/sql/DBKnexResource'
import { EntityFactory } from '@cleverjs/backend/core/entity/EntityFactory'
import { Article } from './Article'
import { ArticleService } from './ArticleService'
import { ArticleEntityResource } from './resource/ArticleEntityResource'

// Create DBKnexResource with connection, condition parser, and table info
const resource = new DBKnexResource(connection, ConditionDbParser.getInstance(), { table: 'article' })

// Create DBEntityResource with the low-level resource and entity factory
const articleEntityResource = new ArticleEntityResource(resource, new EntityFactory(Article))

// Pass resource directly to AbstractService
const articleService = new ArticleService(articleEntityResource)
```

Our [App.ts](../../demo/App.ts) should be changed in the following way:

```ts
import knex, { Knex } from 'knex'
import connections from '../knexfile'
import cors from '@fastify/cors'
import { HttpServerFactory, THttpServer } from '@cleverjs/backend/http'
import { WSServer } from '@cleverjs/backend/core/ws/WSServer'
import { EntityFactory } from '@cleverjs/backend/core/entity/EntityFactory'
import { ConditionDbParser } from '@cleverjs/backend/core/db/sql/condition/ConditionDbParser'
import { DBKnexResource } from '@cleverjs/backend/core/db/sql/DBKnexResource'
import { loggerNamespace } from '@cleverjs/backend/core/logger/logger'
import { ArticleService } from './app/modules/article/ArticleService'
import { ArticleEntityResource } from './app/modules/article/resource/ArticleEntityResource'
import { ArticleWSController } from './controllers/ArticleWSController'
import { ArticleHTTPController } from './controllers/ArticleHTTPController'

const knexConfig = (connections as any)[
  process.env.NODE_ENV || 'development'
] as Knex.Config

export class App {
  protected readonly connection: Knex
  protected readonly httpServer
  protected readonly wsServer: WSServer
  protected readonly logger = loggerNamespace('App')

  public constructor() {
    const websocketOptions = {
      port: 8080,
      keepalive: 50 * 1000, // Check that connection is alive every 50 seconds
      path: '/ws',
    }

    const httpServerFactory = new HttpServerFactory()
    this.httpServer = httpServerFactory.get(THttpServer.fastify, { port: 8080, host: 'localhost' })
    // Register fastify cors plugin
    this.registerFastifyPlugins()
    this.httpServer.start().catch(this.logger.error)
    this.wsServer = new WSServer(
      websocketOptions,
      this.httpServer.getInstance().server
    )

    // DB connection initialization
    this.connection = knex(knexConfig)

    // Create low-level DB resource, entity resource, and service
    const dbResource = new DBKnexResource(this.connection, ConditionDbParser.getInstance(), { table: 'article' })
    const articleEntityResource = new ArticleEntityResource(dbResource, new EntityFactory(Article))
    const articleService = new ArticleService(articleEntityResource)

    // Controller initialization
    new ArticleHTTPController({
      service: articleService,
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
    this.httpServer.getInstance().register(cors, {
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

[back](../wizard.md)
