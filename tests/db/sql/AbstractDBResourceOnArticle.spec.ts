import Knex from 'knex'
import fs from 'fs-extra'
import { ArticleService } from '../../app/modules/article/ArticleService'
import { ArticleResource } from '../../app/modules/article/resource/ArticleResource'
import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { Article } from '../../app/modules/article/Article'
import * as connections from '../../../knexfile'
import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { Paginator } from '../../../core/utils/Paginator'

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

  const connection = Knex(knexConfig)
  const resource = new ArticleResource(connection, new ConditionDbParser(), new EntityFactory(Article, Article.cast))
  const service = new ArticleService({
    resource,
  })

  beforeAll(async () => {
    fs.removeSync(connectionRecord.filename)
    fs.createFileSync(connectionRecord.filename)
    await connection.schema.createTable('article', (t) => {
      t.increments('id').unsigned().primary()
      t.string('title', 255)
      t.string('author', 255)
    })
  })

  beforeEach(async () => {
    await connection.table('article').truncate()
  })

  afterAll(() => {
    fs.removeSync(connectionRecord.filename)
  })

  test('should insert item', async () => {
    const item = service.createEntity(payload1)

    await service.save(item)
    expect(item.id).toEqual(1)
  })

  test('should findById', async () => {
    const item = service.createEntity(payload1)
    await service.save(item)
    const dbItem = await service.findById(item.id)
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
    await service.delete(item.id)
    const dbItem = await service.findById(item.id)
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
    const dbItem = await service.findById(item.id)
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
    const item1 = service.createEntity(payload1)
    const item2 = service.createEntity(payload2)
    const item3 = service.createEntity(payload3)
    await Promise.all([service.save(item1), service.save(item2), service.save(item3)])

    const paginator = new Paginator()
    paginator.setItemsPerPage(2)

    let dbItems = await service.listRaw(paginator)
    expect(dbItems).toEqual([item1, item2])
    expect(paginator.getTotal()).toEqual(3)

    paginator.nextPage()

    dbItems = await service.listRaw(paginator)
    expect(dbItems).toEqual([item3])
  })
})
