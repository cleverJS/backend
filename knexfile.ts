import Knex from 'knex'
import path from 'path'

const dbPath = path.resolve(`${__dirname}/runtime/db.sqlite`)

const config = {
  client: 'sqlite3',
  connection: {
    filename: dbPath,
  },
  useNullAsDefault: true,
} as Knex.Config

module.exports = {
  test: config,
  development: config,
  production: config,
}
