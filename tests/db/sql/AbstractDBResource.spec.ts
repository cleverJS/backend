// eslint-disable-next-line max-classes-per-file
import knex, { Knex } from 'knex'
import { date, number, object, string } from 'yup'

import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { AbstractDBResource } from '../../../core/db/sql/AbstractDBResource'
import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { logger } from '../../../core/logger/logger'
import { Paginator } from '../../../core/utils/Paginator'
import { currentDateFunction } from '../../../demo/utils/common'
import knexfile, { EDBConfigKey } from '../../../knexfile'

describe('Test AbstractDBResource', () => {
  const conditionDBParse = ConditionDbParser.getInstance()
  const knexfileElement = knexfile[EDBConfigKey.memory]
  const connection = knex(knexfileElement)

  beforeAll(async () => {
    const p1 = connection.schema.createTable('test', (t) => {
      t.increments('id').unsigned().primary()
      t.string('title', 255)
      t.string('modifiedBy', 255)
      t.datetime('from')
      t.datetime('to')
    })

    const p2 = connection.schema.createTable('test2', (t) => {
      t.increments('entryId').unsigned().primary()
      t.string('title', 255)
      t.string('modifiedBy', 255)
      t.datetime('from')
      t.datetime('to')
    })

    await Promise.all([p1, p2])
  })

  beforeEach(async () => {
    await connection.table('test').truncate()
    await connection.table('test2').truncate()
  })

  afterAll(async () => {
    await new Promise((resolve) => {
      connection.destroy(() => {
        logger.info('DB connections closed')
        resolve(true)
      })
    })
  })

  it('should filter by datetime', async () => {
    const factory = new EntityFactory(Test, castTest)
    const startDate = new Date()
    startDate.setHours(0)
    startDate.setMinutes(0)
    startDate.setSeconds(0)

    const endDate = new Date()
    startDate.setHours(23)
    startDate.setMinutes(59)
    startDate.setSeconds(59)

    const item = await factory.create({
      title: 'test',
      from: startDate,
      to: endDate,
    })

    const resource = new TestResource(connection, conditionDBParse, factory)
    await resource.save(item)

    const currentDate = new Date()

    const itemsAll = await resource.findAll()

    expect(itemsAll).toHaveLength(1)

    const condition = new Condition({
      conditions: [
        { operator: TConditionOperator.GREATER_OR_EQUALS, field: 'from', value: currentDate.toISOString() },
        { operator: TConditionOperator.LESS_OR_EQUALS, field: 'to', value: currentDate.toISOString() },
      ],
    })

    const result = await resource.findAll(condition)
    expect(result).toHaveLength(1)
  })

  it('should include all entity fields', async () => {
    const factory = new EntityFactory(Test, castTest)
    const item = await factory.create({
      id: '1',
      title: 'test',
    })

    const resource = new TestResource(connection, conditionDBParse, factory)

    const data = resource.mapToDB(item)

    const objectProperties = Object.keys(data).sort()

    expect(objectProperties).toIncludeAllMembers(['from', 'modifiedBy', 'title', 'to'])

    const dataDB = resource.map({
      id: '1',
      title: 'test',
    })

    expect({
      id: '1',
      title: 'test',
    }).toEqual(dataDB)

    const resource2 = new Test2Resource(connection, conditionDBParse, factory)

    const dataDB2 = resource2.map({
      entryId: '1',
      title: 'test',
    })

    expect({
      entryId: '1',
      id: '1',
      title: 'test',
    }).toEqual(dataDB2)

    const factory2 = new EntityFactory(Test2, castTest2)
    const item2 = await factory2.create({
      entryId: '',
      title: 'test',
    })
    const resource3 = new Test3Resource(connection, conditionDBParse, factory2)

    const data2 = resource3.mapToDB(item2)

    const objectProperties2 = Object.keys(data2).sort()

    expect(objectProperties2).toIncludeAllMembers(['entryId', 'title'])
  })

  it('should not change condition during findAllRaw', () => {
    const factory = new EntityFactory(Test, castTest)

    const resource = new TestResource(connection, conditionDBParse, factory)
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'id', value: 1 }] })
    expect(condition.getSort()).toHaveLength(0)
    resource.findAllRaw(condition, new Paginator())
    expect(condition.getSort()).toHaveLength(0)
  })

  it('should return chosen select', async () => {
    const factory = new EntityFactory(Test, castTest)

    const resource = new TestResource(connection, conditionDBParse, factory)

    const item = await resource.createEntity({ id: 1, title: 'test' })
    await resource.insert(item)

    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'id', value: 1 }] })

    const items = await resource.findAllRaw<{ title: string }>(condition, new Paginator(), ['title'])

    expect({ title: 'test' }).toEqual(items[0])
  })

  it('should change referenced object during mapToDB', async () => {
    const factory = new EntityFactory(Test, castTest)
    const item = await factory.create({
      title: 'test',
    })

    expect(item.getData().modifiedBy).toBeNull()

    const resource = new TestResource(connection, conditionDBParse, factory)
    await resource.save(item)

    expect(item.getData().modifiedBy).toEqual('Modifier')
  })

  it('should put alternative id', async () => {
    const factory = new EntityFactory(Test2)
    const item = await factory.create({})

    const resource = new Test2Resource(connection, conditionDBParse, factory)
    await resource.save(item)

    expect(item.entryId).toEqual(1)
  })

  it('should rollback on failure', async () => {
    const factory = new EntityFactory(Test2)
    const item = await factory.create({
      title: 'Title',
    })

    const resource = new Test2Resource(connection, conditionDBParse, factory)
    try {
      await resource.save(item)

      item.title = 'changed title'
      const trx: Knex.Transaction = await connection.transaction()
      try {
        await resource.save(item, trx)
        await trx.raw('select A sdfgkjsdhfgsdkfjg')
        trx.commit()
        await trx.executionPromise
      } catch (e: any) {
        trx.rollback()
      }
    } catch (e) {
      expect(true).toBeTrue()
    }

    const itemNext = await resource.findById(item.id)
    expect(itemNext?.title || '').toEqual('Title')
  })

  it('should save and modify in transaction', async () => {
    const factory = new EntityFactory(Test2)
    const item1 = await factory.create({
      title: 'Title',
    })

    const item2 = await factory.create({
      title: 'Title',
    })

    const resource = new Test2Resource(connection, conditionDBParse, factory)
    try {
      await resource.save(item1, connection)
      const trx: Knex.Transaction = await connection.transaction()
      try {
        await resource.delete(item1.id, 'test', trx)
        await resource.save(item2, trx)
        trx.commit()
        await trx.executionPromise
      } catch (e: any) {
        trx.rollback()
      }
    } catch (e) {
      expect(true).toBeTrue()
    }

    const count = await resource.count()
    expect(count).toEqual(1)
  })
})

class Test extends AbstractEntity<TTest> implements TTest {
  public id = 0
  public title = ''
  public from = null
  public to = null
  public modifiedBy = null
}

class Test2 extends AbstractEntity<TTest2> implements TTest2 {
  public entryId = ''
  public title = ''
}

class TestResource extends AbstractDBResource<Test> {
  protected table: string = 'test'

  mapToDB(item: Test): any {
    const data = super.mapToDB(item)

    data.modifiedBy = 'Modifier'

    if (data.from) {
      data.from = data.from.toISOString()
    }

    if (data.to) {
      data.to = data.to.toISOString()
    }

    return data
  }

  public map(data: Record<string, any>): any {
    data = super.map(data)

    if (data.from) {
      data.from = new Date(data.from)
    }

    if (data.to) {
      data.to = new Date(data.to)
    }

    return data
  }
}
class Test2Resource extends AbstractDBResource<Test2> {
  protected primaryKey = 'entryId'
  protected table: string = 'test2'
}
class Test3Resource extends AbstractDBResource<Test2> {
  protected table: string = 'test3'
}

interface TTest {
  id: number
  title: string
  from: Date | null
  to: Date | null
  modifiedBy: string | null
}

const scheme = object()
  .defined()
  .shape({
    id: number().defined().default(0),
    title: string().defined().default(''),
    modifiedBy: string().nullable().defined().default(null),
    from: date()
      .transform((castValue, originalValue) => {
        if (!originalValue) {
          return undefined
        }

        return castValue
      })
      .defined()
      .default(currentDateFunction),
    to: date()
      .transform((castValue, originalValue) => {
        if (!originalValue) {
          return undefined
        }

        return castValue
      })
      .defined()
      .default(currentDateFunction),
  })

const castTest = (data: unknown): Promise<TTest> => {
  return scheme.noUnknown().validate(data)
}

const scheme2 = object()
  .required()
  .shape({
    id: number().defined().default(0),
    title: string().defined().default(''),
    entryId: string().defined().default(''),
  })

interface TTest2 {
  title: string
  entryId: string
}

const castTest2 = (data: unknown): Promise<TTest2> => {
  return scheme2.noUnknown().validate(data)
}
