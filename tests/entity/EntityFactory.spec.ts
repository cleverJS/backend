import * as yup from 'yup'
import { AbstractEntity } from '../../core/entity/AbstractEntity'
import { EntityFactory } from '../../core/entity/EntityFactory'

interface ITest extends Object {
  title: string
  internal: string
}

class Test extends AbstractEntity<ITest> implements ITest {
  public id = 0
  public title = ''
  public internal = ''

  #modified: boolean = false

  public setIsModified(value: boolean): void {
    this.#modified = value
  }

  public isModified(): boolean {
    return this.#modified
  }

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

    item.setIsModified(true)
    expect(item.isModified()).toBeTruthy()

    item.setIsModified(false)
    expect(item.isModified()).not.toBeTruthy()

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
