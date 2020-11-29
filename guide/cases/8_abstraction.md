# Abstraction (AbstractDBResource, AbstractService, Condition)

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

- [AbstractDBResource](../../core/db/sql/AbstractDBResource.ts) - abstraction for operating with DB
- [AbstractService](../../core/AbstractService.ts) - abstraction for business logic for operating with DB
- [Condition](../../core/db/Condition.ts) - abstraction for elementary DB conditions which could be parsed into DB <b>WHERE</b> expression

## Condition

First of all we need to start from [Condition](../../core/db/Condition.ts)

It is has the following interface:

```ts
export enum TConditionOperator {
  EQUALS,
  NOT_EQUALS,
  LESS_THAN,
  GREATER_THAN,
  LESS_OR_EQUALS,
  GREATER_OR_EQUALS,
  BETWEEN,
  LIKE,
  NOT_LIKE,
  IN,
  IS_NULL,
  IS_NOT_NULL,
}

export type TConditionLogic = 'and' | 'or'

export interface IConditionItemList {
  logic?: TConditionLogic
  conditions: (IConditionItem | IConditionItemList)[]
}

export interface IConditionItem {
  operator: TConditionOperator
  field: string
  value?: string | number | string[] | number[]
}
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
import { AbstractService } from 'cleverJS/core/AbstractService'
import { Condition, TConditionOperator } from 'cleverJS/core/db/Condition'
import { Article } from './Article'

// Article service is extended with AbstractService
export class ArticleService extends AbstractService<Article> {
  // This method use condition and inherited findAll
  public async findByAuthor(author: string): Promise<Article | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
    return this.deps.resource.findAll(condition)
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

## AbstractDBResource

In the same time ArticleResource service should be extended with AbstractDBResource, and we need to specify DB table and primary key
if it is not 'id' in inherited fields `table` and `primaryKey`

```ts
import { AbstractDBResource } from 'cleverJS/core/db/sql/AbstractDBResource'
import { Article } from '../Article'

export class ArticleResource extends AbstractDBResource<Article> {
  protected table = 'article'
}
``` 

Our [App.ts](../../demo/App.ts) should be changed in the following way:

```ts
import Knex from 'knex'
import * as connections from '../knexfile'
import cors from 'fastify-cors'
import { HttpServer } from 'cleverJS/core/http/HttpServer'
import { WSServer } from 'cleverJS/core/ws/WSServer'
import { EntityFactory } from 'cleverJS/core/entity/EntityFactory'
import { ConditionDbParser } from 'cleverJS/core/db/sql/condition/ConditionDbParser'
import { loggerNamespace } from 'cleverJS/core/logger/logger'
import { ArticleService } from './app/modules/article/ArticleService'
import { ArticleResource } from './app/modules/article/resource/ArticleResource'
import { ArticleWSController } from './controllers/ArticleWSController'
import { ArticleHTTPController } from './controllers/ArticleHTTPController'

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
    this.connection = Knex(knexConfig)

    const conditionDbParser = new ConditionDbParser()

    // Pass DB connection, condition DB parser and EntityFactory for create Article Entity
    const articleResource = new ArticleResource(this.connection, conditionDbParser, new EntityFactory(Article))

    // Pass ArticleResource to ArticleService
    const articleService = new ArticleService({
      resource: articleResource,
    })

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
    return [() => this.wsServer.destroy(), () => this.httpServer.destroy(), , () => this.connection.destroy()]
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

[back](../wizard.md)
