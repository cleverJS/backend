import Knex from 'knex'
import { WSServer } from '../core/ws/WSServer'
import { ISettings } from './configs/SettingsInterface'
import { ResourceContainer } from './ResourceContainer'
import { ServiceContainer } from './ServiceContainer'
import { RouteContainer } from './RouteContainer'
import { HttpServer } from '../core/http/HttpServer'
import { logger } from "../core/logger/logger";

export class App {
  private readonly httpServer: HttpServer
  private readonly wsServer: WSServer
  private readonly connection: Knex

  public constructor(settings: ISettings) {
    this.httpServer = new HttpServer({ port: settings.websocket.port, host: '0.0.0.0' })
    this.httpServer.start().catch(logger.error)
    this.wsServer = new WSServer(settings.websocket, this.httpServer.getServer().server)
    this.connection = Knex(settings.connection)

    const resourceContainer = new ResourceContainer(this.connection)
    const serviceContainer = new ServiceContainer(resourceContainer)
    new RouteContainer(serviceContainer, this.wsServer)
  }

  public destroy() {
    return [() => this.wsServer.destroy(), () => this.connection.destroy(), () => this.httpServer.destroy()]
  }
}
