import { boolean, number, object, string } from 'yup'
import { AbstractEntity } from '../../core/entity/AbstractEntity'
import { EntityFactory } from '../../core/entity/EntityFactory'

interface ITest extends Object {
  id: number
  title: string
  active: boolean
}

const scheme = object()
  .defined()
  .shape({
    id: number().defined().default(0),
    title: string().defined().default(''),
    active: boolean().defined().default(false),
  })

const castTest = (data: unknown): ITest => {
  return scheme.noUnknown().cast(data)
}

class Test extends AbstractEntity<ITest> implements ITest {
  public id = 0
  public title = ''
  public active = false

  #modified: boolean = false

  public setIsModified(value: boolean): void {
    this.#modified = value
  }

  public isModified(): boolean {
    return this.#modified
  }
}

describe('Test EntityFactory', () => {
  it('should create a model', () => {
    const factory = new EntityFactory(Test, castTest)
    const item = factory.create({
      id: 1,
      title: 'test',
      active: 1,
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
      id: 1,
      title: 'test',
      active: true,
    }).toEqual(data)
  })

  it('Test Entity set partial data', () => {
    const factory = new EntityFactory(Test, castTest)
    const item = factory.create({
      id: 1,
      title: 'test',
    })

    expect(item).toEqual({
      id: 1,
      title: 'test',
      active: false,
    })

    item.setData({
      title: 'test2',
    })

    expect(item).toEqual({
      id: 1,
      title: 'test2',
      active: false,
    })
  })
})
