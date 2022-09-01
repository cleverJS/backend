import { ClientOptions } from '@elastic/elasticsearch'
import { Knex } from 'knex'

import { IRedisConfig } from '../../core/db/redis/config'
import { IHttpServerConfig } from '../../core/http/config'
import { ILoggerConfig } from '../../core/logger/config'
import { IWSConfig } from '../../core/ws/config'
import { ISecurityConfig } from '../modules/security/config'

export interface ISettings {
  baseDir: string
  runtimeDir: string
  runtimeTestDir: string

  security: ISecurityConfig
  logger: ILoggerConfig
  http: IHttpServerConfig
  websocket: IWSConfig
  redis: IRedisConfig
  connection: Knex.Config
  elastic: ClientOptions
}
