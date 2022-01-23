import { Knex } from 'knex'
import path from 'path'

const dbPath = path.resolve('./runtime/db.sqlite')

const config = {
  client: 'sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
} as Knex.Config

export default {
  test: config,
  development: config,
  production: config,
}
