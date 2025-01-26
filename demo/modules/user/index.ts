import { Knex } from 'knex'

import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import { DBKnexResource } from '../../../core/db/sql/DBKnexResource'
import { EntityFactory } from '../../../core/entity/EntityFactory'

import { castUser } from './helper'
import { UserEntityResource } from './resource/UserEntityResource'
import { User } from './User'
import { UserService } from './UserService'

class UserInitializer {
  public resource: UserEntityResource
  public service: UserService

  public constructor(connection: Knex) {
    const resource = new DBKnexResource(connection, ConditionDbParser.getInstance(), { table: 'user' })
    this.resource = new UserEntityResource(resource, new EntityFactory(User, castUser))

    this.service = new UserService(this.resource)
  }
}

export { User, UserService, UserEntityResource, UserInitializer }
