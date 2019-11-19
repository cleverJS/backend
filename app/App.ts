import { logger } from '../core/logger/logger'
import { Mongo } from '../core/db/mongo/Mongo'
import { HttpServer } from '../core/http/HttpServer'
import { WSServer } from '../core/ws/WSServer'
import { Redis } from '../core/db/redis/Redis'
import { ISettings } from './configs/SettingsInterface'
import { Cache } from '../core/cache/Cache'
import { CacheService } from '../core/cache/CacheService'
import { NullAdapter } from '../core/cache/adapter/NullAdapter'
import { ResourceContainer } from './ResourceContainer'
import { ServiceContainer } from './ServiceContainer'
import { RouteContainer } from './RouteContainer'

export class App {
  private readonly mongo: Mongo
  private readonly httpServer: HttpServer
  private readonly wsServer: WSServer
  private readonly cache: Cache
  private readonly redis: Redis

  public constructor(settings: ISettings) {
    this.redis = new Redis(settings.redis)
    this.cache = new Cache(new CacheService(new NullAdapter()))
    this.httpServer = new HttpServer(settings.http)
    this.wsServer = new WSServer(settings.websocket)
    this.mongo = new Mongo(settings.mongodb)

    const resourceContainer = new ResourceContainer(this.mongo)
    const serviceContainer = new ServiceContainer(resourceContainer)
    new RouteContainer(serviceContainer, this.httpServer, this.cache, this.redis, this.wsServer)

    this.httpServer.start().catch(logger.error)
  }

  public destroy() {
    return [
      async () => this.httpServer.destroy(),
      async () => this.wsServer.destroy(),
      async () => this.mongo.destroy(),
      async () => this.redis.destroy,
    ]
  }
}
