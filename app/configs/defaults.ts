import Knex from 'knex'
import path from 'path'
import { ISettings } from './SettingsInterface'
import * as connections from '../../knexfile'

const knexConfig = (connections as any)[process.env.NODE_ENV || 'development'] as Knex.Config

export const defaults: ISettings = {
  baseDir: path.resolve(`${__dirname}/../`),
  runtimeDir: path.resolve(`${__dirname}/../../runtime`),
  runtimeTestDir: path.resolve(`${__dirname}/../../runtime/test`),

  logger: {
    debug: false,
    warn: true,
    info: true,
  },

  http: {
    port: 8000,
    host: '0.0.0.0',
  },

  mongodb: {
    url: 'mongodb://localhost:27017',
    db: 'backend',
  },

  connection: knexConfig,

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
}
