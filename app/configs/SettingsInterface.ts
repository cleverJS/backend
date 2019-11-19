import { IHttpServerConfig } from '../../core/http/config'
import { IMongoConfig } from '../../core/db/mongo/config'
import { IWSConfig } from '../../core/ws/config'
import { IRedisConfig } from '../../core/db/redis/config'
import { ISecurityConfig } from '../../example/cubes/security/config'

export interface ISettings {
  baseDir: string
  runtimeDir: string
  runtimeTestDir: string

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

  security: ISecurityConfig
}
