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
public actionSingIn = async (request: WSRequest, connection: IConnection): Promise<IJSendResponse> => {
  const { login, password } = request.payload

  const { user, accessToken, refreshToken } = await this.deps.authService.signIn(login, password)
  
  connection.state.userId = user.id
  connection.state.token = accessToken

  return this.responseSuccess({
                                accessToken,
                                refreshToken,
                                user: user.getNonSecureData(),
                              })
}

public actionSingInByToken = async (request: WSRequest, connection: IConnection): Promise<IJSendResponse> => {
  const { token } = request.payload

  const { user } = await this.deps.authService.authByToken(token)

  connection.state.userId = user.id
  connection.state.token = token

  return this.responseSuccess({
                                user: user.getNonSecureData(),
                              })
}
```

You want to have `state` autocomplete while you write code. Create IAppConnection `interface` which extends IConnection and then 
your action will become as the following:

```ts
export interface IConnectionState {
  userId: number
  token: string
}

export interface IAppConnection extends IConnection {
  state: IConnectionState
}

public actionSingIn = async (request: WSRequest, connection: IAppConnection): Promise<IJSendResponse> => {
  const { login, password } = request.payload

  const { user, accessToken, refreshToken } = await this.deps.authService.signIn(login, password)
  
  connection.state.userId = user.id
  connection.state.token = accessToken

  return this.responseSuccess({
                                accessToken,
                                refreshToken,
                                user: user.getNonSecureData(),
                              })
}
```

## Events and Broadcast 

Websocket give you ability to send events on a frontend. This could be useful in case of data changes which is necessary for established connections.

Let's see an example, where frontend subscribes to article changes and should get an event about that.

Assume that we trigger an event on `Article` save. For that we add event emitter into our [ArticleService](demo/modules/article/ArticleService.ts)
and override `save` method

```ts
import TypedEmitter from 'typed-emitter'
import { EventEmitter } from 'events'
import { AbstractService } from '../../../core/AbstractService'
import { Article } from './Article'
import { ArticleResource } from './resource/ArticleResource'

export interface ArticleEvents {
  new: (item: Article) => void
}

export class ArticleService extends AbstractService<Article, ArticleResource> {
  public readonly eventEmitter: TypedEmitter<ArticleEvents> = new EventEmitter()

  public async save(item: Article): Promise<boolean> {
    const result = await super.save(item)

    if (result) {
      this.eventEmitter.emit('new', item)
    }

    return result
  }
}
```

From the other side [ArticleController](demo/controllers/ArticleWSController.ts) should listen for that event (see method `onEvents`)

```ts
import { WSServer } from '../../core/ws/WSServer'
import { ArticleService } from '../modules/article/ArticleService'
import { WSResponse } from '../../core/ws/WSResponse'
import { IAppConnection } from '../types/WSConnection'

interface IDependencies {
  wsServer: WSServer
  articleService: ArticleService
}

export class ArticleWSController {
  public constructor(deps: IDependencies) {
    this.deps = deps
    this.onEvents()
  }

  protected onEvents(): void {
    this.deps.articleService.eventEmitter.on('new', (item) => {
      // This will be execute on Article changes
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
import { WSServer } from '../../core/ws/WSServer'
import { ArticleService } from '../modules/article/ArticleService'
import { WSResponse } from '../../core/ws/WSResponse'
import { IAppConnection } from '../types/WSConnection'

interface IDependencies {
  wsServer: WSServer
  articleService: ArticleService
}

export class ArticleWSController {
  public constructor(deps: IDependencies) {
    this.deps = deps
    this.onEvents()
  }

  public actionSubscribe = async (request: WSRequest, connection: IAppConnection): Promise<Record<string, any>> => {
    connection.state.subscriptions.article = true

    return {
      success: true,
    }
  }  

  protected onEvents(): void {
    this.deps.articleService.eventEmitter.on('new', (item) => {
      // This will be execute on new Article changes
    })
  }

  protected init(): void {
    this.deps.wsServer.onRequest('article', 'subscribe', this.actionSubscribe)
  }
}
```

Send broadcast event by all connections where frontend is subscribed

```ts
import { WSServer } from '../../core/ws/WSServer'
import { ArticleService } from '../modules/article/ArticleService'
import { WSResponse } from '../../core/ws/WSResponse'
import { IAppConnection } from '../types/WSConnection'

interface IDependencies {
  wsServer: WSServer
  articleService: ArticleService
}

export class ArticleWSController {
  public constructor(deps: IDependencies) {
    this.deps = deps
    this.onEvents()
  }

  public actionSubscribe = async (request: WSRequest, connection: IAppConnection): Promise<Record<string, any>> => {
    connection.state.subscriptions.article = true

    return {
      success: true,
    }
  }  

  protected onEvents(): void {
    this.deps.articleService.eventEmitter.on('new', (item) => {
      this.deps.wsServer.broadcast((connection: IAppConnection) => {
        return new Promise((resolve) => {
          let result = null
          if (connection.state.subscriptions.article) {
            result = WSResponse.createEventResponse('article:new', { data: item })
          }

          resolve(result)
        })
      })
    })
  }

  protected init(): void {
    this.deps.wsServer.onRequest('article', 'subscribe', this.actionSubscribe)
  }
}
```

[back](../../wizard.md)
