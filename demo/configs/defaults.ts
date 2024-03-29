import path from 'path'

import connections, { EDBConfigKey } from '../../knexfile'

import { ISettings } from './SettingsInterface'

const appConfigKey = (process.env.NODE_ENV || EDBConfigKey.development) as EDBConfigKey
const appKnexConfig = connections[appConfigKey]

const dirname = path.resolve()
const baseDir = dirname

export const defaults: ISettings = {
  baseDir: path.resolve(`${baseDir}`),
  runtimeDir: path.resolve(`${baseDir}/runtime`),
  runtimeTestDir: path.resolve(`${baseDir}/runtime/test`),

  logger: {
    debug: false,
    warn: true,
    info: true,
  },

  http: {
    port: 8000,
    host: 'localhost',
  },

  connection: appKnexConfig,

  websocket: {
    port: 8000,
    keepalive: 20 * 1000,
    path: '/ws',
  },

  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
  },

  security: {
    jwtToken: {
      privateKey: path.join(baseDir, '/demo/configs/keys/default/rs256.key'),
      publicKey: path.join(baseDir, '/demo/configs/keys/default/rs256.pub.key'),
      algorithm: 'RS256',
    },
  },

  elastic: {
    node: process.env.ELASTIC_HOST || 'http://localhost:9200',
    auth: {
      username: process.env.ELASTIC_USER || '',
      password: process.env.ELASTIC_PASSWORD || '',
    },
  },
}
