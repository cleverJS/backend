import { AbstractEntity } from './AbstractEntity'
import * as yup from 'yup'
import { EntityFactory } from './EntityFactory'

interface ITest extends Object {
  title: string
  internal: string
}

class Test extends AbstractEntity<ITest> implements ITest {
  public title = ''
  public internal = ''

  public static cast(data: any) {
    return yup
      .object()
      .shape({
        id: yup.string(),
        title: yup.string(),
      })
      .noUnknown()
      .cast(data)
  }
}

describe('Test EntityFactory', () => {
  it('should create a model', () => {
    const factory = new EntityFactory(Test, Test.cast)
    const item = factory.create({
      id: '1',
      title: 'test',
      something: 'strange',
      complex: {
        title: 'ComplexTitle',
      },
    })

    const data = item.getData()

    expect({
      id: '1',
      title: 'test',
      internal: '',
    }).toEqual(data)

    const fields: Set<keyof ITest> = new Set(['title'])
    for (const field of fields) {
      data[field]
    }
  })
})
