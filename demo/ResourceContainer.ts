import Knex from 'knex'
import { EntityFactory } from '../core/entity/EntityFactory'
import { ArticleResource } from './modules/article/resource/ArticleResource'
import { ConditionDbParser } from '../core/db/sql/condition/ConditionDbParser'
import { Article } from './modules/article/Article'
import { castArticle } from './modules/article/helper'

export class ResourceContainer {
  public readonly articleResource: ArticleResource

  constructor(connection: Knex) {
    const articleEntityFactory = new EntityFactory(Article, castArticle)
    this.articleResource = new ArticleResource(connection, new ConditionDbParser(), articleEntityFactory)
  }
}
