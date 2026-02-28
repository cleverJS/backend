# Websocket

[back](../../wizard.md)

- [State](#state)
- [Events & Broadcast](#events-and-broadcast)

## State

All connections are stored in runtime variable with its `state`

You could store some connection related data into this state. It could be user id, token or
any other necessary data which you do not want to get from a DB on every user request.

**Note:** Keep state small, because it takes place in memory.

The better place to put data into state is Controller. There are `sign in` and `sign in by token` actions in this example:

```ts
public actionSingIn = async (request: WSRequest, connectionInfo: IConnectionInfo): Promise<Record<string, any>> => {
  const { login, password } = request.payload

  const { user, accessToken, refreshToken } = await this.deps.authService.signIn(login, password)

  connectionInfo.state.userId = user.id
  connectionInfo.state.token = accessToken

  return {
    status: 'success',
    data: {
      accessToken,
      refreshToken,
      user: user.getNonSecureData(),
    },
  }
}

public actionSingInByToken = async (request: WSRequest, connectionInfo: IConnectionInfo): Promise<Record<string, any>> => {
  const { token } = request.payload

  const { user } = await this.deps.authService.authByToken(token)

  connectionInfo.state.userId = user.id
  connectionInfo.state.token = token

  return {
    status: 'success',
    data: {
      user: user.getNonSecureData(),
    },
  }
}
```

You want to have `state` autocomplete while you write code. Create IAppConnectionInfo `interface` which extends IConnectionInfo and then
your action will become as the following:

```ts
import { IConnectionInfo } from '@cleverjs/backend/core/ws/WSServer'

export interface IConnectionState {
  userId: number
  token: string
}

export interface IAppConnectionInfo extends IConnectionInfo {
  state: IConnectionState
}

public actionSingIn = async (request: WSRequest, connectionInfo: IAppConnectionInfo): Promise<Record<string, any>> => {
  const { login, password } = request.payload

  const { user, accessToken, refreshToken } = await this.deps.authService.signIn(login, password)

  connectionInfo.state.userId = user.id
  connectionInfo.state.token = accessToken

  return {
    status: 'success',
    data: {
      accessToken,
      refreshToken,
      user: user.getNonSecureData(),
    },
  }
}
```

## Events and Broadcast

Websocket give you ability to send events on a frontend. This could be useful in case of data changes which is necessary for established connections.

Let's see an example, where frontend subscribes to article changes and should get an event about that.

Assume that we trigger an event on `Article` save. For that we add event emitter into our [ArticleService](../../../demo/modules/article/ArticleService.ts)
and override `save` method

```ts
import TypedEmitter from 'typed-emitter'
import { EventEmitter } from 'events'
import { AbstractService } from '@cleverjs/backend/core/AbstractService'
import { Article } from './Article'
import { ArticleEntityResource } from './resource/ArticleEntityResource'

export type ArticleEvents = {
  new: (item: Article) => void
}

export class ArticleService extends AbstractService<Article, ArticleEntityResource> {
  public readonly eventEmitter: TypedEmitter<ArticleEvents> = new EventEmitter() as TypedEmitter<ArticleEvents>

  public async save(item: Article): Promise<boolean> {
    const result = await super.save(item)

    if (result) {
      this.eventEmitter.emit('new', item)
    }

    return result
  }
}
```

From the other side [ArticleWSController](../../../demo/controllers/ArticleWSController.ts) should listen for that event (see method `onEvents`)

```ts
import { WSServer } from '@cleverjs/backend/core/ws/WSServer'
import { ArticleService } from '../modules/article/ArticleService'
import { WSResponse } from '@cleverjs/backend/core/ws/WSResponse'
import { IAppConnectionInfo } from '../types/WSConnection'

export class ArticleWSController {
  protected readonly wsServer: WSServer
  protected readonly service: ArticleService

  public constructor(wsServer: WSServer, service: ArticleService) {
    this.wsServer = wsServer
    this.service = service
    this.onEvents()
  }

  protected onEvents(): void {
    this.service.eventEmitter.on('new', (item) => {
      // This will be executed on Article changes
    })
  }
}
```

In the following step we want that frontend connection subscribes to this event. Add subscriptions to IConnectionState interface

```ts
export interface IConnectionState {
  userId: number
  token: string
  subscriptions: {
    article: boolean
  }
}
```

Add action for subscribing

```ts
import { WSServer } from '@cleverjs/backend/core/ws/WSServer'
import { WSRequest } from '@cleverjs/backend/core/ws/WSRequest'
import { ArticleService } from '../modules/article/ArticleService'
import { WSResponse } from '@cleverjs/backend/core/ws/WSResponse'
import { IAppConnectionInfo } from '../types/WSConnection'

export class ArticleWSController {
  protected readonly wsServer: WSServer
  protected readonly service: ArticleService

  public constructor(wsServer: WSServer, service: ArticleService) {
    this.wsServer = wsServer
    this.service = service
    this.init()
    this.onEvents()
  }

  public actionSubscribe = async (request: WSRequest, connectionInfo: IAppConnectionInfo): Promise<Record<string, any>> => {
    connectionInfo.state.subscriptions.article = true

    return {
      success: true,
    }
  }

  protected onEvents(): void {
    this.service.eventEmitter.on('new', (item) => {
      // This will be executed on new Article changes
    })
  }

  protected init(): void {
    this.wsServer.onRequest('article', 'subscribe', this.actionSubscribe)
  }
}
```

Send broadcast event by all connections where frontend is subscribed.

The `broadcast` callback receives two arguments: `connectionInfo` and `client` (WebSocket instance).
It should return `Promise<WSResponse | null>`.

```ts
import { WSServer, IConnectionInfo } from '@cleverjs/backend/core/ws/WSServer'
import { WSRequest } from '@cleverjs/backend/core/ws/WSRequest'
import { ArticleService } from '../modules/article/ArticleService'
import { WSResponse } from '@cleverjs/backend/core/ws/WSResponse'
import { IAppConnectionInfo } from '../types/WSConnection'
import WebSocket from 'ws'

export class ArticleWSController {
  protected readonly wsServer: WSServer
  protected readonly service: ArticleService

  public constructor(wsServer: WSServer, service: ArticleService) {
    this.wsServer = wsServer
    this.service = service
    this.init()
    this.onEvents()
  }

  public actionSubscribe = async (request: WSRequest, connectionInfo: IAppConnectionInfo): Promise<Record<string, any>> => {
    connectionInfo.state.subscriptions.article = true

    return {
      success: true,
    }
  }

  protected onEvents(): void {
    this.service.eventEmitter.on('new', (item) => {
      this.wsServer.broadcast(async (connectionInfo: IAppConnectionInfo, client: WebSocket) => {
        let result = null
        if (connectionInfo.state.subscriptions.article) {
          result = WSResponse.createEventResponse('article:new', { data: item })
        }

        return result
      })
    })
  }

  protected init(): void {
    this.wsServer.onRequest('article', 'subscribe', this.actionSubscribe)
  }
}
```

[back](../../wizard.md)
