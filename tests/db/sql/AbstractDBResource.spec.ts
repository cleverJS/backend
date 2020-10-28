import * as yup from 'yup'
import Knex from 'knex'
import fs from 'fs-extra'
import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { AbstractDBResource } from '../../../core/db/sql/AbstractDBResource'
import { ConditionDbParser } from '../../../core/db/sql/condition/ConditionDbParser'
import path from 'path'

const scheme = yup.object().required().shape({
  id: yup.string(),
  title: yup.string(),
})

type TTest = yup.InferType<typeof scheme>

const scheme2 = yup.object().required().shape({
  title: yup.string(),
})

type TTest2 = yup.InferType<typeof scheme2>

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
    public id = 0
    public title = ''

    public static cast(data: any) {
      return yup
        .object()
        .required()
        .shape({
          id: yup.string(),
          title: yup.string(),
        })
        .noUnknown()
        .cast(data)
    }
  }

  class Test2 extends AbstractEntity<TTest> implements TTest2 {
    public title = ''

    public static cast(data: any) {
      return yup
        .object()
        .required()
        .shape({
          title: yup.string(),
        })
        .noUnknown()
        .cast(data)
    }
  }

  class TestResource extends AbstractDBResource<Test> {}
  class Test2Resource extends AbstractDBResource<Test> {
    protected primaryKey = 'entryId'
  }
  class Test3Resource extends AbstractDBResource<Test2> {}


  it('should', () => {
    const factory = new EntityFactory(Test, Test.cast)
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

    const factory2 = new EntityFactory(Test2, Test2.cast)
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
