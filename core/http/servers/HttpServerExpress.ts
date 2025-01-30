import express, { Express, Request, Response } from 'express'
import { Server } from 'http'

import { IHttpServerConfig } from '../config'
import { HttpServer } from '../HttpServer'

export class HttpServerExpress extends HttpServer {
  protected readonly instance: Express
  #server?: Server

  public constructor(config: IHttpServerConfig) {
    super(config)
    this.instance = express()
  }

  public async start() {
    try {
      const { host, port } = this.config
      this.#server = this.instance.listen(port, host, () => {
        this.logger.info(`listening on ${host}:${port}`)
      })
    } catch (err) {
      this.logger.error(err)
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }
  }

  public async destroy(callback?: (err?: Error) => void): Promise<void> {
    this.#server?.close(callback)
  }

  get(path: string, handler: (req: Request, res: Response) => void) {
    this.instance.get(path, handler)
  }

  post(path: string, handler: (req: Request, res: Response) => void) {
    this.instance.post(path, handler)
  }

  put(path: string, handler: (req: Request, res: Response) => void) {
    this.instance.put(path, handler)
  }

  delete(path: string, handler: (req: Request, res: Response) => void) {
    this.instance.delete(path, handler)
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
