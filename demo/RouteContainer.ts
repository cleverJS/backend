import { initRoutes } from '../core/decorators/routes'
import { HttpServerFastify } from '../core/http/servers/HttpServerFastify'
import { WSServer } from '../core/ws/WSServer'

import { ArticleHTTPController } from './controllers/ArticleHTTPController'
import { ArticleWSController } from './controllers/ArticleWSController'
import { AuthController } from './controllers/AuthController'
import { UserController } from './controllers/UserController'
import { ServiceContainer } from './ServiceContainer'

export class RouteContainer {
  public constructor(services: ServiceContainer, wsServer: WSServer, http: HttpServerFastify) {
    this.initWS(services, wsServer, http)
    this.initHTTP(services, http)
    initRoutes(wsServer)
  }

  protected initWS(services: ServiceContainer, wsServer: WSServer, http: HttpServerFastify): void {
    new UserController(wsServer, services.userService)
    new AuthController(wsServer, http, services.authService, services.userService)
    new ArticleWSController(wsServer, services.articleService)
  }

  protected initHTTP(services: ServiceContainer, http: HttpServerFastify): void {
    new ArticleHTTPController({
      http,
      service: services.articleService,
    })
  }
}
