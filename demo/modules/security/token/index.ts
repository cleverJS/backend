import { Knex } from 'knex'

import { ConditionDbParser } from '../../../../core/db/sql/condition/ConditionDbParser'
import { DBKnexResource } from '../../../../core/db/sql/DBKnexResource'
import { EntityFactory } from '../../../../core/entity/EntityFactory'

import { AuthToken } from './AuthToken'
import { AuthTokenService } from './AuthTokenService'
import { castAuthToken } from './helper'
import { AuthTokenEntityResource } from './resource/AuthTokenEntityResource'

class AuthTokenInitializer {
  public resource: AuthTokenEntityResource
  public service: AuthTokenService

  public constructor(connection: Knex) {
    const resource = new DBKnexResource(connection, ConditionDbParser.getInstance(), { table: 'auth_token' })
    this.resource = new AuthTokenEntityResource(resource, new EntityFactory(AuthToken, castAuthToken))

    this.service = new AuthTokenService(this.resource)
  }
}

export { AuthToken, AuthTokenService, AuthTokenEntityResource, AuthTokenInitializer }
