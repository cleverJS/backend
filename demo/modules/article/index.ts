import { Knex } from 'knex'

import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import { DBKnexResource } from '../../../core/db/sql/DBKnexResource'
import { EntityFactory } from '../../../core/entity/EntityFactory'

import { Article } from './Article'
import { ArticleService } from './ArticleService'
import { castArticle } from './helper'
import { ArticleEntityResource } from './resource/ArticleEntityResource'

class ArticleInitializer {
  public resource: ArticleEntityResource
  public service: ArticleService

  public constructor(connection: Knex) {
    const resource = new DBKnexResource(connection, ConditionDbParser.getInstance(), { table: 'article' })
    this.resource = new ArticleEntityResource(resource, new EntityFactory(Article, castArticle))

    this.service = new ArticleService(this.resource)
  }
}

export { Article, ArticleService, ArticleEntityResource, ArticleInitializer }
