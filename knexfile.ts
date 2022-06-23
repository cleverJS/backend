import { Knex } from 'knex'
import path from 'path'

const dbPath = path.resolve('./runtime/db.sqlite')

export enum EDBConfigKey {
  development = 'development',
  production = 'production',
  test = 'test',
  memory = 'memory',
}

const config = {
  client: 'sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
} as Knex.Config

export default {
  [EDBConfigKey.test]: config,
  [EDBConfigKey.development]: config,
  [EDBConfigKey.production]: config,
  [EDBConfigKey.memory]: {
    client: 'sqlite3',
    useNullAsDefault: true,
    connection: {
      filename: ':memory:',
    },
  } as Knex.Config,
}
