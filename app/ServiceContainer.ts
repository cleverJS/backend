import { ResourceContainer } from './ResourceContainer'
import { ArticleService } from './cubes/article/ArticleService'

export class ServiceContainer {
  public readonly articleService: ArticleService

  public constructor(resources: ResourceContainer) {
    this.articleService = new ArticleService({
      resource: resources.articleResource,
    })
  }
}
