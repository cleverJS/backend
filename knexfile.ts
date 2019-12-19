import Knex from 'knex'

const developmentMigrationsDirectory = './migrations/development'
const productionMigrationsDirectory = './migrations/production'

module.exports = {
  test: {
    client: 'postgresql',
    connection: {
      database: 'db',
      user: '',
      password: '',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: developmentMigrationsDirectory,
    },
    seeds: {
      directory: `${developmentMigrationsDirectory}/seeds`,
    },
  } as Knex.Config,

  development: {
    client: 'postgresql',
    connection: {
      database: 'db',
      user: '',
      password: '',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: developmentMigrationsDirectory,
    },
    seeds: {
      directory: `${developmentMigrationsDirectory}/seeds`,
    },
  } as Knex.Config,

  production: {
    client: 'postgresql',
    connection: {
      user: 'db',
      password: '',
      host: '',
      database: '',
    },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: productionMigrationsDirectory,
    },
  } as Knex.Config,
}
