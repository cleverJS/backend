import fastify, { FastifyInstance } from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import { loggerNamespace } from '../logger/logger'
import { IHttpServerConfig } from './config'

export class HttpServer {
  protected readonly logger = loggerNamespace('HttpServer')
  protected readonly server: FastifyInstance<Server, IncomingMessage, ServerResponse>
  protected readonly port: number = 5000
  protected readonly address: string = '0.0.0.0'

  constructor(config: IHttpServerConfig) {
    this.server = fastify({})
    this.port = config.port
    this.address = config.host
  }

  public async start(): Promise<void> {
    try {
      await this.server.listen(this.port, this.address)
      this.logger.info(`listening on ${this.address}:${this.port}`)
    } catch (err) {
      this.logger.error(err)
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }
  }

  public getServer(): FastifyInstance<Server, IncomingMessage, ServerResponse> {
    return this.server
  }

  public getInstance(): Server {
    return this.server.server
  }

  public async destroy(): Promise<void> {
    const server = await this.getServer()
    await new Promise((resolve) => {
      server.close(() => {
        resolve(true)
      })
    })
    this.logger.info('closed')
  }
}
