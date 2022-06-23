import { Knex } from 'knex'

export function createArticleTable(connection: Knex) {
  return connection.schema.createTable('article', (t) => {
    t.increments('id').unsigned().primary()
    t.string('title', 255)
    t.string('author', 255)
    t.string('content', 255)
    t.datetime('from')
    t.datetime('to')
    t.datetime('created')
    t.boolean('isPublished').defaultTo(false)
  })
}
