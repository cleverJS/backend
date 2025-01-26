import { Knex } from 'knex'

import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import { DBKnexResource } from '../../../core/db/sql/DBKnexResource'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { settings } from '../../configs'

import { File } from './File'
import { FileService } from './FileService'
import { castFile } from './helper'
import { FileEntityResource } from './resource/FileEntityResource'

class FileInitializer {
  public resource: FileEntityResource
  public service: FileService

  public constructor(connection: Knex) {
    const resource = new DBKnexResource(connection, ConditionDbParser.getInstance(), { table: 'file' })
    this.resource = new FileEntityResource(resource, new EntityFactory(File, castFile))

    this.service = new FileService(settings.runtimeDir, this.resource)
  }
}

export { File, FileService, FileEntityResource, FileInitializer }
