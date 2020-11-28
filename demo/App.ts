import Knex from 'knex'
import cors from 'fastify-cors'
import { WSServer } from '../core/ws/WSServer'
import { ISettings } from './configs/SettingsInterface'
import { ResourceContainer } from './ResourceContainer'
import { ServiceContainer } from './ServiceContainer'
import { RouteContainer } from './RouteContainer'
import { HttpServer } from '../core/http/HttpServer'
import { loggerNamespace } from '../core/logger/logger'

export class App {
  protected readonly logger = loggerNamespace('App')
  protected readonly httpServer: HttpServer
  protected readonly wsServer: WSServer
  protected readonly connection: Knex

  public constructor(settings: ISettings) {
    this.httpServer = new HttpServer({ port: settings.websocket.port, host: 'localhost' })
    this.registerFastifyPlugins()
    this.httpServer.start().catch(this.logger.error)
    this.wsServer = new WSServer(settings.websocket, this.httpServer.getServer().server)
    this.connection = Knex(settings.connection)

    const resourceContainer = new ResourceContainer(this.connection)
    const serviceContainer = new ServiceContainer(resourceContainer)
    new RouteContainer(serviceContainer, this.wsServer, this.httpServer)
  }

  // This will be called on process finish and terminate http server
  public destroy() {
    return [() => this.wsServer.destroy(), () => this.connection.destroy(), () => this.httpServer.destroy()]
  }

  protected registerFastifyPlugins(): void {
    this.httpServer.getServer().register(cors, {
      origin: true,
      credentials: true,
      allowedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'authorization', 'Content-Type'],
    })
  }
}
