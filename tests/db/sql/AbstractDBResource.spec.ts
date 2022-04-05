// eslint-disable-next-line max-classes-per-file
import { object, string } from 'yup'
import path from 'path'
import knex from 'knex'
import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { AbstractDBResource } from '../../../core/db/sql/AbstractDBResource'
import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import { FSWrapper } from '../../../core/utils/fsWrapper'
import { logger } from '../../../core/logger/logger'
import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { Paginator } from '../../../core/utils/Paginator'

interface TTest {
  id: string
  title: string
}

const scheme = object()
  .defined()
  .shape({
    id: string().defined().default('0'),
    title: string().defined().default(''),
  })

const castTest = (data: unknown): TTest => {
  return scheme.noUnknown().cast(data)
}

const scheme2 = object()
  .required()
  .shape({
    title: string().defined().default(''),
  })

interface TTest2 {
  title: string
}

const castTest2 = (data: unknown): TTest2 => {
  return scheme2.noUnknown().cast(data)
}

describe('Test AbstractDBResource', () => {
  const dbPath = path.resolve('./runtime/db.sqlite')
  const conditionDBParse = ConditionDbParser.getInstance()

  const connection = knex({
    client: 'sqlite3',
    connection: {
      filename: dbPath,
    },
    useNullAsDefault: true,
  })

  beforeAll(async () => {
    FSWrapper.removeSync(dbPath)
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
    // FSWrapper.createFileSync(dbPath)
  })

  afterEach(() => {
    // FSWrapper.removeSync(dbPath)
  })

  afterAll(async () => {
    // FSWrapper.removeSync(dbPath)
    await new Promise((resolve) => {
      connection.destroy(() => {
        logger.info('DB connections closed')
        resolve(true)
      })
    })
  })

  it('should', () => {
    const factory = new EntityFactory(Test, castTest)
    const item = factory.create({
      id: '1',
      title: 'test',
    })

    const resource = new TestResource(connection, conditionDBParse, factory)

    const data = resource.mapToDB(item)
    expect({
      title: 'test',
    }).toEqual(data)

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
    const item2 = factory.create({
      title: 'test',
    })
    const resource3 = new Test3Resource(connection, conditionDBParse, factory2)

    const data2 = resource3.mapToDB(item2)
    expect({
      title: 'test',
    }).toEqual(data2)
  })

  it('should not change condition during findAllRaw', () => {
    const factory = new EntityFactory(Test, castTest)

    const resource = new TestResource(connection, conditionDBParse, factory)
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'id', value: 1 }] })
    expect(condition.getSort()).toHaveLength(0)
    resource.findAllRaw(condition, new Paginator())
    expect(condition.getSort()).toHaveLength(0)
  })
})

class Test extends AbstractEntity<TTest> implements TTest {
  public id = '0'
  public title = ''
}

class Test2 extends AbstractEntity<TTest> implements TTest2 {
  public title = ''
}

class TestResource extends AbstractDBResource<Test> {
  protected table: string = 'article'
}
class Test2Resource extends AbstractDBResource<Test> {
  protected primaryKey = 'entryId'
  protected table: string = 'article'
}
class Test3Resource extends AbstractDBResource<Test2> {
  protected table: string = 'article'
}
