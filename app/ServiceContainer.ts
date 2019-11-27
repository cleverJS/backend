import { ResourceContainer } from './ResourceContainer'
import { ArticleService } from './cubes/article/ArticleService'
import { EventEmitter } from 'events'

export class ServiceContainer {
  public readonly articleService: ArticleService

  public constructor(resources: ResourceContainer, eventEmitter: EventEmitter) {
    this.articleService = new ArticleService({
      eventEmitter,
      resource: resources.articleResource,
    })
  }
}
