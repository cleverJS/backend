import { IHttpServerConfig } from '../../core/http/config'
import { IMongoConfig } from '../../core/db/mongo/config'
import { IWSConfig } from '../../core/ws/config'
import { IRedisConfig } from '../../core/db/redis/config'
import { ILoggerConfig } from '../../core/logger/config'

export interface ISettings {
  baseDir: string
  runtimeDir: string
  runtimeTestDir: string

  logger: ILoggerConfig
  http: IHttpServerConfig
  websocket: IWSConfig
  mongodb: IMongoConfig
  redis: IRedisConfig

  db: {
    user: string
    password: string
    server: string
    database: string
  }
}
