import { ResourceContainer } from './ResourceContainer'
import { ArticleService } from './modules/article/ArticleService'

export class ServiceContainer {
  public readonly articleService: ArticleService

  public constructor(resources: ResourceContainer) {
    const { articleResource } = resources
    this.articleService = new ArticleService(articleResource)
  }
}
