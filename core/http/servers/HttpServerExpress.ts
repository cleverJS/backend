import express, { Express, Request, RequestHandler, Response } from 'express'
import { Server } from 'http'

import { IHttpServerConfig } from '../config'
import { HttpServer, THttpRoute } from '../HttpServer'

export type TExpressRouteOpts = {
  middleware?: RequestHandler[]
}

export class HttpServerExpress extends HttpServer<Request, Response, Express, TExpressRouteOpts> {
  protected readonly instance: Express
  #server?: Server
  private started = false

  public constructor(config: IHttpServerConfig) {
    super(config)
    this.instance = express()
  }

  public async start(): Promise<void> {
    if (this.started) {
      throw new Error('Server already started')
    }

    const { host, port } = this.config
    this.#server = this.instance.listen(port, host)

    await new Promise<void>((resolve, reject) => {
      this.#server!.once('listening', () => {
        this.started = true
        this.logger.info(`listening on ${host}:${port}`)
        resolve()
      })
      this.#server!.once('error', reject)
    })
  }

  public async destroy(): Promise<void> {
    if (!this.#server) {
      return
    }

    await new Promise((resolve, reject) => {
      this.#server!.close((err) => {
        this.started = false
        if (err) {
          reject(err)
        } else {
          resolve(true)
        }
      })
    })
  }

  public route(route: THttpRoute<Request, Response, TExpressRouteOpts>) {
    const method = route.method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch' | 'options' | 'head'
    const middleware = route.options?.middleware || []
    this.instance[method](route.path, ...middleware, route.handler)
  }

  public getInstance(): Express {
    return this.instance
  }

  public getServer(): Server {
    if (!this.#server) {
      throw new Error('Server is missing')
    }

    return this.#server
  }
}
