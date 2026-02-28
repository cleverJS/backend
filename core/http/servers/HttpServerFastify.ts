import fastify, { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest, FastifyTypeProviderDefault, RouteShorthandOptions } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'http'

import { IHttpServerConfig } from '../config'
import { HttpServer, THttpRoute } from '../HttpServer'

export class HttpServerFastify extends HttpServer<FastifyRequest, FastifyReply, TFastifyInstance, RouteShorthandOptions> {
  protected readonly instance: TFastifyInstance
  private started = false

  public constructor(config: IHttpServerConfig) {
    super(config)
    this.instance = fastify({})
  }

  public async start(): Promise<void> {
    if (this.started) {
      throw new Error('Server already started')
    }

    const { host, port } = this.config
    await this.instance.listen({ port, host })
    this.started = true
    this.logger.info(`listening on ${host}:${port}`)
  }

  public async destroy(): Promise<void> {
    if (!this.started) {
      return
    }

    await this.instance.close()
    this.started = false
  }

  public route(route: THttpRoute<FastifyRequest, FastifyReply, RouteShorthandOptions>) {
    this.instance.route({
      ...(route.options || {}),
      method: route.method,
      url: route.path,
      handler: route.handler,
    })
  }

  public getInstance(): TFastifyInstance {
    return this.instance
  }

  public getServer(): Server {
    return this.instance.server
  }
}

type TFastifyInstance = FastifyInstance<
  Server<typeof IncomingMessage, typeof ServerResponse>,
  IncomingMessage,
  ServerResponse<IncomingMessage>,
  FastifyBaseLogger,
  FastifyTypeProviderDefault
>
