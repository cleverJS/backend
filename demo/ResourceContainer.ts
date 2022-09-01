import { Knex } from 'knex'

import { ConditionDbParser } from '../core/db/sql/condition/ConditionDbParser'
import { EntityFactory } from '../core/entity/EntityFactory'

import { Article } from './modules/article/Article'
import { castArticle } from './modules/article/helper'
import { ArticleResource } from './modules/article/resource/ArticleResource'
import { File } from './modules/file/File'
import { castFile } from './modules/file/helper'
import { FileResource } from './modules/file/resource/FileResource'
import { AuthToken } from './modules/security/token/AuthToken'
import { castAuthToken } from './modules/security/token/helper'
import { AuthTokenResource } from './modules/security/token/resource/AuthTokenResource'
import { castUser } from './modules/user/helper'
import { UserResource } from './modules/user/resource/UserResource'
import { User } from './modules/user/User'

export class ResourceContainer {
  public readonly userResource: UserResource
  public readonly authTokenResource: AuthTokenResource
  public readonly articleResource: ArticleResource
  public readonly fileResource: FileResource

  constructor(connection: Knex<any, unknown[]>) {
    const conditionDbParser = ConditionDbParser.getInstance()
    const userEntityFactory = new EntityFactory(User, castUser)
    const authTokenEntityFactory = new EntityFactory(AuthToken, castAuthToken)
    const articleEntityFactory = new EntityFactory(Article, castArticle)

    this.userResource = new UserResource(connection, conditionDbParser, userEntityFactory)
    this.authTokenResource = new AuthTokenResource(connection, conditionDbParser, authTokenEntityFactory)
    this.articleResource = new ArticleResource(connection, conditionDbParser, articleEntityFactory)
    this.fileResource = new FileResource(connection, conditionDbParser, new EntityFactory(File, castFile))
  }
}
