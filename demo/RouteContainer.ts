import { ServiceContainer } from './ServiceContainer'
import { WSServer } from '../core/ws/WSServer'
import { HttpServer } from '../core/http/HttpServer'
import { ArticleWSController } from './controllers/ArticleWSController'
import { ArticleHTTPController } from './controllers/ArticleHTTPController'
import { AuthController } from './controllers/AuthController'
import { initRoutes } from '../core/decorators/routes'
import { UserController } from './controllers/UserController'

export class RouteContainer {
  public constructor(services: ServiceContainer, wsServer: WSServer, http: HttpServer) {
    this.initWS(services, wsServer, http)
    this.initHTTP(services, http)
    initRoutes(wsServer)
  }

  protected initWS(services: ServiceContainer, wsServer: WSServer, http: HttpServer): void {
    new UserController(wsServer, services.userService)
    new AuthController(wsServer, http, services.authService, services.userService)
    new ArticleWSController(wsServer, services.articleService)
  }

  protected initHTTP(services: ServiceContainer, http: HttpServer): void {
    new ArticleHTTPController({
      http,
      service: services.articleService,
    })
  }
}
