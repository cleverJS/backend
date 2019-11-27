import { ArticleController } from './cubes/article/ArticleController'
import { ServiceContainer } from './ServiceContainer'
import { HttpServer } from '../core/http/HttpServer'
import { WSServer } from '../core/ws/WSServer'

export class RouteContainer {
  public constructor(services: ServiceContainer, http: HttpServer, wsServer: WSServer) {
    this.init(services, http, wsServer)
  }

  protected init(services: ServiceContainer, http: HttpServer, wsServer: WSServer) {
    new ArticleController({
      wsServer,
      http,
      articleService: services.articleService,
    })
  }
}
