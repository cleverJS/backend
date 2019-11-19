import { ArticleController } from './cubes/article/ArticleController'
import { ServiceContainer } from './ServiceContainer'
import { HttpServer } from '../core/http/HttpServer'
import { Cache } from '../core/cache/Cache'
import { Redis } from '../core/db/redis/Redis'
import { WSServer } from '../core/ws/WSServer'

export class RouteContainer {
  public constructor(services: ServiceContainer, http: HttpServer, cache: Cache, redis: Redis, wsServer: WSServer) {
    this.init(services, http, cache, redis, wsServer)
  }

  protected init(services: ServiceContainer, http: HttpServer, cache: Cache, redis: Redis, wsServer: WSServer) {
    new ArticleController({
      cache,
      redis,
      wsServer,
      http,
      articleService: services.articleService,
    })
  }
}
