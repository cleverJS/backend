import path from 'path'
import { ISettings } from './SettingsInterface'

export const defaults: ISettings = {
  baseDir: path.resolve(`${__dirname}/../`),
  runtimeDir: path.resolve(`${__dirname}/../../runtime`),
  runtimeTestDir: path.resolve(`${__dirname}/../../runtime/test`),

  http: {
    port: 8000,
  },

  mongodb: {
    url: 'mongodb://localhost:27017',
    db: 'backend',
  },

  db: {
    user: '',
    password: '',
    server: '',
    database: '',
  },

  websocket: {
    keepalive: 60 * 1000,
    port: 8001,
  },

  redis: {
    host: 'localhost',
    port: 6379,
    db: 0,
  },

  security: {
    jwtToken: {
      privateKey: path.join(__dirname, './keys/default/rs256.key'),
      publicKey: path.join(__dirname, './keys/default/rs256.pub.key'),
      algorithm: 'RS512',
    },
  },
}
