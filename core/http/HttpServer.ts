import fastify from 'fastify'
import { Server, IncomingMessage, ServerResponse } from 'http'
import { loggerNamespace } from '../logger/logger'
import { Ready } from '../utils/ready'
import { IHttpServerConfig } from './config'

export class HttpServer {
  private readonly logger = loggerNamespace('HttpServer')
  private connected = new Ready()
  private readonly server: fastify.FastifyInstance<Server, IncomingMessage, ServerResponse>
  private readonly port: number = 5000

  constructor(config: IHttpServerConfig) {
    this.server = fastify({})
    this.port = config.port
  }

  public async start() {
    try {
      await this.server.listen(this.port)
      this.connected.resolve()
      this.logger.info(`listening on ${this.port}`)
    } catch (err) {
      this.logger.error(err)
      process.exit(1)
    }
  }

  public getServer(): fastify.FastifyInstance<Server, IncomingMessage, ServerResponse> {
    return this.server
  }

  public async destroy() {
    this.logger.info('destroy')
    const server = await this.getServer()
    server.close().catch(this.logger.error)
  }
}
