import { Knex } from 'knex'

export async function createArticleTable(connection: Knex) {
  try {
    await connection.schema.dropTable('article')
  } catch (e) {
    // nothing
  }

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

export async function createFileTable(connection: Knex) {
  try {
    await connection.schema.dropTable('file')
  } catch (e) {
    // nothing
  }

  return connection.schema.createTable('file', (t) => {
    t.increments('id').unsigned().primary()
    t.string('code', 255)
    t.string('name', 255)
    t.string('mime', 255)
    t.string('baseDir', 255)
    t.string('sort')
    t.jsonb('data')
    t.integer('url', 255)
    t.dateTime('createdAt')
    t.dateTime('updatedAt')
  })
}
