import { EntityFactory } from '../core/entity/EntityFactory'
import { Article } from './cubes/article/Article'
import Knex from 'knex'
import { ArticleResource } from './cubes/article/resource/ArticleResource'
import { ConditionDbParser } from '../core/db/sql/condition/ConditionDbParser'

export class ResourceContainer {
  public readonly articleResource: ArticleResource

  constructor(connection: Knex) {
    this.articleResource = new ArticleResource(connection, new ConditionDbParser(), new EntityFactory(Article, Article.cast))
  }
}
