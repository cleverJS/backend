import { Knex, knex } from 'knex'
import * as connections from '../../../../knexfile'
import { ConditionDbParser } from '../../../../core/db/sql/condition/ConditionDbParser'
import { EntityFactory } from '../../../../core/entity/EntityFactory'
import { Condition, TConditionOperator } from '../../../../core/db/Condition'
import { Paginator } from '../../../../core/utils/Paginator'
import { ArticleResource } from '../../../../demo/modules/article/resource/ArticleResource'
import { Article } from '../../../../demo/modules/article/Article'
import { ArticleService } from '../../../../demo/modules/article/ArticleService'
import { castArticle } from '../../../../demo/modules/article/helper'
import { FSWrapper } from '../../../../core/utils/fsWrapper'

const knexConfig = (connections as any)[process.env.NODE_ENV || 'development'] as Knex.Config
const connectionRecord = knexConfig.connection as Knex.Sqlite3ConnectionConfig

describe('Test AbstractDBResource and AbstractService', () => {
  const payload1 = {
    title: 'The Fundamentals of Mathematical Analysis I',
    author: 'G. M. Fikhtengolts',
  }

  const payload2 = {
    title: 'The Fundamentals of Mathematical Analysis II',
    author: 'G. M. Fikhtengolts',
  }

  const payload3 = {
    title: 'The Fundamentals of Mathematical Analysis III',
    author: 'G. M. Fikhtengolts',
  }

  const connection = knex(knexConfig)
  const resource = new ArticleResource(connection, new ConditionDbParser(), new EntityFactory(Article, castArticle))
  const service = new ArticleService(resource)

  beforeAll(async () => {
    FSWrapper.removeSync(connectionRecord.filename)
    FSWrapper.createFileSync(connectionRecord.filename)
    await connection.schema.createTable('article', (t) => {
      t.increments('id').unsigned().primary()
      t.string('title', 255)
      t.string('author', 255)
      t.string('content', 255)
      t.boolean('isPublished').defaultTo(false)
    })
  })

  beforeEach(async () => {
    await connection.table('article').truncate()
  })

  afterAll(() => {
    FSWrapper.removeSync(connectionRecord.filename)
  })

  test('should insert item', async () => {
    const item = service.createEntity(payload1)

    await service.save(item)
    expect(item.id).toEqual(1)
  })

  test('should findById', async () => {
    const item = service.createEntity(payload1)
    await service.save(item)

    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }
    expect(dbItem).toEqual(item)
  })

  test('should findAll', async () => {
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const condition = new Condition({
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'title', value: 'The Fundamentals of Mathematical Analysis II' }],
    })
    const dbItem = await service.findOne(condition)
    expect(item2).toEqual(dbItem)

    const dbItems = await service.findAll()
    expect(dbItems).toEqual([item1, item2, item3])
  })

  test('should findAll with pagination', async () => {
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const paginator = new Paginator()
    paginator.setItemsPerPage(2)

    let dbItems = await service.findAll(undefined, paginator)
    expect(dbItems).toEqual([item1, item2])

    paginator.nextPage()

    dbItems = await service.findAll(undefined, paginator)
    expect(dbItems).toEqual([item3])
  })

  test('should delete', async () => {
    const item = service.createEntity(payload1)
    await service.save(item)

    let dbItem
    if (item.id) {
      await service.delete(item.id)
      dbItem = await service.findById(item.id)
    }
    expect(dbItem).toBeNull()
  })

  test('should deleteAll', async () => {
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const condition = new Condition({
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'title', value: 'The Fundamentals of Mathematical Analysis II' }],
    })

    await service.deleteAll(condition)
    const dbItems = await service.findAll()
    expect(dbItems).toEqual([item1, item3])
  })

  test('should truncate', async () => {
    const item = service.createEntity(payload1)
    await service.save(item)
    await service.truncate()
    const dbItems = await service.findAll()
    expect(dbItems).toEqual([])
  })

  test('should update item', async () => {
    const item = service.createEntity(payload1)

    await service.save(item)

    item.title = 'The Fundamentals of Mathematical Analysis II'
    await service.save(item)
    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }
    expect(dbItem?.title).toEqual('The Fundamentals of Mathematical Analysis II')
  })

  test('should remove primary key on update item', async () => {
    const item = service.createEntity(payload1)

    await service.save(item)

    item.title = 'The Fundamentals of Mathematical Analysis II'

    if (item.id) {
      const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'id', value: item.id }] })
      await resource.update(condition, item.getData())
    }

    let dbItem
    if (item.id) {
      dbItem = await service.findById(item.id)
    }
    expect(dbItem?.title).toEqual('The Fundamentals of Mathematical Analysis II')
  })

  test('should batchInsert', async () => {
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)

    await resource.batchInsert([item1, item2, item3])

    const dbItems = await service.findAll()
    expect(dbItems.length).toEqual(3)
  })

  test('should remove id on batchInsert', async () => {
    const item1 = service.createEntity({ ...payload1, id: 1 })
    const item2 = service.createEntity({ ...payload2, id: 2 })
    const item3 = service.createEntity({ ...payload3, id: 3 })

    await resource.batchInsert([item1, item2, item3])

    const dbItems = await service.findAll()
    expect(dbItems.length).toEqual(3)
  })

  test('should batchInsert with chunk size', async () => {
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)

    await resource.batchInsert([item1, item2, item3], 1)

    const dbItems = await service.findAll()
    expect(dbItems.length).toEqual(3)
  })

  test('should count', async () => {
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)

    await resource.batchInsert([item1, item2, item3])

    const count = await service.count()
    expect(count).toEqual(3)
  })

  test('should count with condition', async () => {
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)

    await resource.batchInsert([item1, item2, item3])

    const condition = new Condition({
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'title', value: 'The Fundamentals of Mathematical Analysis II' }],
    })

    const count = await service.count(condition)
    expect(count).toEqual(1)
  })

  test('should list', async () => {
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const paginator = new Paginator()
    paginator.setItemsPerPage(2)

    let dbItems = await service.list(paginator)
    expect(dbItems).toEqual([item1, item2])
    expect(paginator.getTotal()).toEqual(3)

    paginator.nextPage()

    dbItems = await service.list(paginator)
    expect(dbItems).toEqual([item3])
  })

  test('should listRaw', async () => {
    const expectRaw = [
      {
        author: 'G. M. Fikhtengolts',
        content: '',
        id: 1,
        isPublished: 0,
        title: 'The Fundamentals of Mathematical Analysis I',
      },
      {
        author: 'G. M. Fikhtengolts',
        content: '',
        id: 2,
        isPublished: 0,
        title: 'The Fundamentals of Mathematical Analysis II',
      },
    ]

    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const paginator = new Paginator()
    paginator.setItemsPerPage(2)

    let dbItems = await service.listRaw(paginator)
    expect(dbItems).toEqual(expectRaw)
    expect(paginator.getTotal()).toEqual(3)

    paginator.nextPage()

    dbItems = await service.listRaw(paginator)
    expect(dbItems).toEqual([
      {
        author: 'G. M. Fikhtengolts',
        content: '',
        id: 3,
        isPublished: 0,
        title: 'The Fundamentals of Mathematical Analysis III',
      },
    ])
  })
})
