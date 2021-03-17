import { Knex } from 'knex'
import { EntityFactory } from '../core/entity/EntityFactory'
import { ArticleResource } from './modules/article/resource/ArticleResource'
import { ConditionDbParser } from '../core/db/sql/condition/ConditionDbParser'
import { Article } from './modules/article/Article'
import { castArticle } from './modules/article/helper'
import { AuthTokenResource } from './modules/security/token/resource/AuthTokenResource'
import { UserResource } from './modules/user/resource/UserResource'
import { User } from './modules/user/User'
import { castUser } from './modules/user/helper'
import { AuthToken } from './modules/security/token/AuthToken'
import { castAuthToken } from './modules/security/token/helper'

export class ResourceContainer {
  public readonly userResource: UserResource
  public readonly authTokenResource: AuthTokenResource
  public readonly articleResource: ArticleResource

  constructor(connection: Knex) {
    const conditionDbParser = new ConditionDbParser()
    const userEntityFactory = new EntityFactory(User, castUser)
    const authTokenEntityFactory = new EntityFactory(AuthToken, castAuthToken)
    const articleEntityFactory = new EntityFactory(Article, castArticle)

    this.userResource = new UserResource(connection, conditionDbParser, userEntityFactory)
    this.authTokenResource = new AuthTokenResource(connection, conditionDbParser, authTokenEntityFactory)
    this.articleResource = new ArticleResource(connection, new ConditionDbParser(), articleEntityFactory)
  }
}
