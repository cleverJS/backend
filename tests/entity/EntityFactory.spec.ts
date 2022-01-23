import { EntityFactory } from '../../core/entity/EntityFactory'
import { castTest, Test } from './Test'

describe('Test EntityFactory', () => {
  it('should create a model', () => {
    const factory = new EntityFactory(Test, castTest)

    const payload = {
      id: 1,
      title: 'test',
      active: 1,
      something: 'strange',
      complex: {
        title: 'ComplexTitle',
      },
    }

    const item = factory.create(payload)

    item.setIsModified(true)
    expect(item.isModified()).toBeTruthy()

    item.setIsModified(false)
    expect(item.isModified()).not.toBeTruthy()

    const data = item.getData()

    expect({
      id: 1,
      title: 'test',
      object: {},
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
      object: {},
      active: false,
    })

    item.setData({
      title: 'test2',
    })

    expect(item).toEqual({
      id: 1,
      title: 'test2',
      object: {},
      active: false,
    })
  })

  it('should clone payload on entity creation', () => {
    const factory = new EntityFactory(Test, castTest)

    const payload = {
      id: 1,
      title: 'test',
      active: 1,
      object: {
        id: 2,
      },
    }

    const item = factory.create(payload)
    payload.object.id = 3

    expect({
      id: 1,
      title: 'test',
      active: true,
      object: {
        id: 2,
      },
    }).toEqual(item.getData())
  })
})
