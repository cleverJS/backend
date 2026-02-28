import { Server } from 'http'

import { loggerNamespace } from '../logger/logger'

import { IHttpServerConfig } from './config'

export abstract class HttpServer<TReq = unknown, TRes = unknown, TInstance = unknown, TRouteOpts = unknown> {
  protected readonly config: IHttpServerConfig
  protected readonly logger = loggerNamespace(`HttpServer:${this.constructor.name}`)

  public constructor(config: IHttpServerConfig) {
    this.config = config
  }

  public abstract start(): Promise<void>
  public abstract destroy(): Promise<void>
  public abstract route(route: THttpRoute<TReq, TRes, TRouteOpts>): void

  public abstract getInstance(): TInstance
  public abstract getServer(): Server

  public getConfig(): IHttpServerConfig {
    return this.config
  }
}

export type THttpRoute<TReq = unknown, TRes = unknown, TRouteOpts = unknown> = {
  method: THttpMethod
  path: string
  handler: (req: TReq, res: TRes) => unknown
  options?: TRouteOpts
}

export type THttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'
