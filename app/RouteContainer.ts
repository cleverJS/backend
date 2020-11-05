import { ArticleController } from './modules/article/ArticleController'
import { ServiceContainer } from './ServiceContainer'
import { WSServer } from '../core/ws/WSServer'

export class RouteContainer {
  public constructor(services: ServiceContainer, wsServer: WSServer) {
    this.init(services, wsServer)
  }

  protected init(services: ServiceContainer, wsServer: WSServer) {
    new ArticleController({
      wsServer,
      articleService: services.articleService,
    })
  }
}
