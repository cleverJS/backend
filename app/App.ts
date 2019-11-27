import { logger } from '../core/logger/logger'
import { Mongo } from '../core/db/mongo/Mongo'
import { HttpServer } from '../core/http/HttpServer'
import { WSServer } from '../core/ws/WSServer'
import { ISettings } from './configs/SettingsInterface'
import { ResourceContainer } from './ResourceContainer'
import { ServiceContainer } from './ServiceContainer'
import { RouteContainer } from './RouteContainer'
import { EventEmitter } from 'events'

export class App {
  private readonly mongo: Mongo
  private readonly httpServer: HttpServer
  private readonly wsServer: WSServer
  private readonly eventEmitter: EventEmitter

  public constructor(settings: ISettings) {
    this.eventEmitter = new EventEmitter()
    this.httpServer = new HttpServer(settings.http)
    this.wsServer = new WSServer(settings.websocket, this.eventEmitter)
    this.mongo = new Mongo(settings.mongodb)

    const resourceContainer = new ResourceContainer(this.mongo)
    const serviceContainer = new ServiceContainer(resourceContainer, this.eventEmitter)
    new RouteContainer(serviceContainer, this.httpServer, this.wsServer)

    this.httpServer.start().catch(logger.error)
  }

  public destroy() {
    return [
      async () => this.httpServer.destroy(),
      async () => this.wsServer.destroy(),
      async () => this.mongo.destroy(),
    ]
  }
}
