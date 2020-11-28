// eslint-disable-next-line max-classes-per-file
import * as yup from 'yup'
import path from 'path'
import Knex from 'knex'
import fs from 'fs-extra'
import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { AbstractDBResource } from '../../../core/db/sql/AbstractDBResource'
import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'

interface TTest {
  id: string
  title: string
}

const scheme = yup.object().required().shape({
  id: yup.string(),
  title: yup.string(),
})

const castTest = (data: unknown): TTest => {
  return scheme.noUnknown().cast(data)
}

const scheme2 = yup.object().required().shape({
  title: yup.string(),
})

interface TTest2 {
  title: string
}

const castTest2 = (data: unknown): TTest2 => {
  return scheme2.noUnknown().cast(data)
}

describe('Test AbstractDBResource', () => {
  const dbPath = path.resolve(`${__dirname}/db.sqlite`)

  beforeEach(() => {
    fs.createFileSync(dbPath)
  })

  afterEach(() => {
    fs.removeSync(dbPath)
  })

  afterAll(() => {
    fs.removeSync(dbPath)
  })

  class Test extends AbstractEntity<TTest> implements TTest {
    public id = '0'
    public title = ''
  }

  class Test2 extends AbstractEntity<TTest> implements TTest2 {
    public title = ''
  }

  class TestResource extends AbstractDBResource<Test> {}
  class Test2Resource extends AbstractDBResource<Test> {
    protected primaryKey = 'entryId'
  }
  class Test3Resource extends AbstractDBResource<Test2> {}

  it('should', () => {
    const factory = new EntityFactory(Test, castTest)
    const item = factory.create({
      id: '1',
      title: 'test',
    })

    const connection = Knex({
      client: 'sqlite3',
      connection: {
        filename: dbPath,
      },
    })

    const resource = new TestResource(connection, new ConditionDbParser(), factory)

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

    const resource2 = new Test2Resource(connection, new ConditionDbParser(), factory)

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
    const resource3 = new Test3Resource(connection, new ConditionDbParser(), factory2)

    const data2 = resource3.mapToDB(item2)
    expect({
      title: 'test',
    }).toEqual(data2)
  })
})
