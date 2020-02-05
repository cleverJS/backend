import { logger } from '../core/logger/logger'
import { HttpServer } from '../core/http/HttpServer'
import { WSServer } from '../core/ws/WSServer'
import { ISettings } from './configs/SettingsInterface'
import { ResourceContainer } from './ResourceContainer'
import { ServiceContainer } from './ServiceContainer'
import { RouteContainer } from './RouteContainer'
import Knex from 'knex'

export class App {
  private readonly httpServer: HttpServer
  private readonly wsServer: WSServer
  private readonly connection: Knex

  public constructor(settings: ISettings) {
    this.httpServer = new HttpServer(settings.http)
    this.wsServer = new WSServer(settings.websocket)
    this.connection = Knex(settings.connection)

    const resourceContainer = new ResourceContainer(this.connection)
    const serviceContainer = new ServiceContainer(resourceContainer)
    new RouteContainer(serviceContainer, this.httpServer, this.wsServer)

    this.httpServer.start().catch(logger.error)
  }

  public destroy() {
    return [
      async () => this.httpServer.destroy(),
      async () => this.wsServer.destroy(),
      async () => this.connection.destroy(),
    ]
  }
}
