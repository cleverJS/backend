// eslint-disable-next-line max-classes-per-file
import knex from 'knex'
import { date, number, object, string } from 'yup'

import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { AbstractDBResource } from '../../../core/db/sql/AbstractDBResource'
import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { logger } from '../../../core/logger/logger'
import { Paginator } from '../../../core/utils/Paginator'
import { currentDateFunction } from '../../../demo/utils/common'
import connections, { EDBConfigKey } from '../../../knexfile'

interface TTest {
  id: number
  title: string
  from: Date | null
  to: Date | null
}

const scheme = object()
  .defined()
  .shape({
    id: number().defined().default(0),
    title: string().defined().default(''),
    from: date()
      .transform((castValue, originalValue) => {
        return new Date(originalValue)
      })
      .defined()
      .default(currentDateFunction),
    to: date()
      .transform((castValue, originalValue) => {
        return new Date(originalValue)
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
    title: string().defined().default(''),
  })

interface TTest2 {
  title: string
}

const castTest2 = (data: unknown): Promise<TTest2> => {
  return scheme2.noUnknown().validate(data)
}

describe('Test AbstractDBResource', () => {
  const conditionDBParse = ConditionDbParser.getInstance()
  const appKnexConfig = connections[EDBConfigKey.memory]
  const connection = knex(appKnexConfig)

  beforeAll(async () => {
    await connection.schema.createTable('test', (t) => {
      t.increments('id').unsigned().primary()
      t.string('title', 255)
      t.datetime('from')
      t.datetime('to')
    })
  })

  beforeEach(async () => {
    await connection.table('test').truncate()
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
        { operator: TConditionOperator.GREATER_OR_EQUALS, field: 'from', value: currentDate },
        { operator: TConditionOperator.LESS_OR_EQUALS, field: 'to', value: currentDate },
      ],
    })

    const result = await resource.findAll(condition)
    expect(result).toHaveLength(1)
  })

  it('should', async () => {
    const factory = new EntityFactory(Test, castTest)
    const item = await factory.create({
      id: '1',
      title: 'test',
    })

    const resource = new TestResource(connection, conditionDBParse, factory)

    const data = resource.mapToDB(item)

    const objectProperties = Object.keys(data).sort()

    expect(objectProperties).toEqual(['from', 'title', 'to'].sort())

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
    const item2 = await factory.create({
      title: 'test',
    })
    const resource3 = new Test3Resource(connection, conditionDBParse, factory2)

    const data2 = resource3.mapToDB(item2)

    const objectProperties2 = Object.keys(data2).sort()

    expect(objectProperties2).toEqual(['from', 'title', 'to'].sort())
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

    await resource.insert({ id: 1, title: 'test' })

    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'id', value: 1 }] })

    const [item] = await resource.findAllRaw<{ title: string }>(condition, new Paginator(), ['title'])

    expect({ title: 'test' }).toEqual(item)
  })
})

class Test extends AbstractEntity<TTest> implements TTest {
  public id = 0
  public title = ''
  public from = null
  public to = null
}

class Test2 extends AbstractEntity<TTest> implements TTest2 {
  public title = ''
}

class TestResource extends AbstractDBResource<Test> {
  protected table: string = 'test'
}
class Test2Resource extends AbstractDBResource<Test> {
  protected primaryKey = 'entryId'
  protected table: string = 'test'
}
class Test3Resource extends AbstractDBResource<Test2> {
  protected table: string = 'test'
}
