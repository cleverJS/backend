import { Server } from 'http'

import { loggerNamespace } from '../logger/logger'

import { IHttpServerConfig } from './config'

export abstract class HttpServer {
  protected readonly config: IHttpServerConfig
  protected readonly logger = loggerNamespace(`HttpServer:${this.constructor.name}`)

  public constructor(config: IHttpServerConfig) {
    this.config = config
  }

  public abstract start(callback: () => void): void
  public abstract destroy(callback: () => void): void
  public abstract get(path: string, handler: (req: any, res: any) => void): void
  public abstract post(path: string, handler: (req: any, res: any) => void): void
  public abstract put(path: string, handler: (req: any, res: any) => void): void
  public abstract delete(path: string, handler: (req: any, res: any) => void): void

  public abstract getInstance(): unknown
  public abstract getServer(): Server
}

export type THttpRoute = {
  method: THttpMethod
  path: string
  handler: (req: any, res: any) => void
}

export type THttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD'
