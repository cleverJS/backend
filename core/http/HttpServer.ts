import fastify, { FastifyInstance } from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import { loggerNamespace } from '../logger/logger'
import { IHttpServerConfig } from './config'

export class HttpServer {
  public readonly port: number = 5000
  public readonly host: string = '0.0.0.0'
  protected readonly logger = loggerNamespace('HttpServer')
  protected readonly instance: FastifyInstance<Server, IncomingMessage, ServerResponse>

  constructor(config: IHttpServerConfig) {
    this.instance = fastify({})
    this.port = config.port
    this.host = config.host
  }

  public async start(): Promise<void> {
    try {
      await this.instance.listen({ port: this.port, host: this.host })
      this.logger.info(`listening on ${this.host}:${this.port}`)
    } catch (err) {
      this.logger.error(err)
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }
  }

  public getServer(): FastifyInstance<Server, IncomingMessage, ServerResponse> {
    return this.instance
  }

  public getInstance(): Server {
    return this.instance.server
  }

  public async destroy(): Promise<void> {
    await this.getServer().close()
    this.logger.info('closed')
  }
}
