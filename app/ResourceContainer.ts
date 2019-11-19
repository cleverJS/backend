import { ArticleResourceMongo } from './cubes/article/resource/ArticleResourceMongo'
import { EntityFactory } from '../core/entity/EntityFactory'
import { Article } from './cubes/article/Article'
import { Mongo } from '../core/db/mongo/Mongo'

export class ResourceContainer {
  public readonly articleResource: ArticleResourceMongo

  constructor(mongo: Mongo) {
    this.articleResource = new ArticleResourceMongo(mongo, new EntityFactory(Article, Article.cast))
  }
}
