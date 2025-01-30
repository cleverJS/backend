import fastify, { FastifyBaseLogger, FastifyInstance, FastifyReply, FastifyRequest, FastifyTypeProviderDefault } from 'fastify'
import { IncomingMessage, Server, ServerResponse } from 'http'

import { IHttpServerConfig } from '../config'
import { HttpServer, THttpRoute } from '../HttpServer'

export class HttpServerFastify extends HttpServer {
  protected readonly instance: TFastifyInstance

  public constructor(config: IHttpServerConfig) {
    super(config)
    this.instance = fastify({})
  }

  public async start() {
    try {
      const { host, port } = this.config
      await this.instance.listen({ port, host })
      this.logger.info(`listening on ${host}:${port}`)
    } catch (err) {
      this.logger.error(err)
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }
  }

  public async destroy(callback?: (err?: Error) => void): Promise<void> {
    this.instance.server.close(callback)
  }

  public get(path: string, handler: (req: FastifyRequest, res: FastifyReply) => void) {
    this.instance.get(path, handler)
  }

  public post(path: string, handler: (req: FastifyRequest, res: FastifyReply) => void) {
    this.instance.post(path, handler)
  }

  public put(path: string, handler: (req: FastifyRequest, res: FastifyReply) => void) {
    this.instance.put(path, handler)
  }

  public delete(path: string, handler: (req: FastifyRequest, res: FastifyReply) => void) {
    this.instance.delete(path, handler)
  }

  public route(route: THttpRoute) {
    this.instance.route({
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
