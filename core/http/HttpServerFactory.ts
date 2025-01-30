import { IHttpServerConfig } from './config'
import { HttpServerExpress } from './servers/HttpServerExpress'
import { HttpServerFastify } from './servers/HttpServerFastify'

export class HttpServerFactory {
  private serverMap = {
    [THttpServer.fastify]: HttpServerFastify,
    [THttpServer.express]: HttpServerExpress,
  }

  public get<T extends THttpServer>(server: T, config: IHttpServerConfig): InstanceType<(typeof this.serverMap)[T]> {
    const ServerClass = this.serverMap[server]

    if (!ServerClass) {
      throw new Error(`${server} is not a valid HTTP server`)
    }

    return new ServerClass(config) as any
  }
}

export enum THttpServer {
  fastify,
  express,
}
