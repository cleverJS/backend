import { ServiceContainer } from './ServiceContainer'
import { WSServer } from '../core/ws/WSServer'
import { HttpServer } from '../core/http/HttpServer'
import { ArticleWSController } from './controllers/ArticleWSController'
import { ArticleHTTPController } from './controllers/ArticleHTTPController'
import { AuthController } from './controllers/AuthController'
import { initRoutes } from '../core/decorators/routes'

export class RouteContainer {
  public constructor(services: ServiceContainer, wsServer: WSServer, http: HttpServer) {
    this.initWS(services, wsServer, http)
    this.initHTTP(services, http)
    initRoutes(wsServer)
  }

  protected initWS(services: ServiceContainer, wsServer: WSServer, http: HttpServer): void {
    new AuthController({
      wsServer,
      http,
      authService: services.authService,
      userService: services.userService,
    })

    new ArticleWSController({
      wsServer,
      articleService: services.articleService,
    })
  }

  protected initHTTP(services: ServiceContainer, http: HttpServer): void {
    new ArticleHTTPController({
      http,
      articleService: services.articleService,
    })
  }
}
