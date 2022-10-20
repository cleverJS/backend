import { EntityFactory } from '../../core/entity/EntityFactory'

import { castTest, Test } from './Test'

describe('Test EntityFactory', () => {
  it('should create a model with non empty title', async () => {
    const factory = new EntityFactory(Test, castTest)

    const payload = {
      id: '1',
      title: 'the Fundamentals of Mathematical Analysis I',
      active: 1,
    }

    const item = await factory.create(payload)

    const data = item.getData()

    expect({
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis I',
      body: '',
      object: {},
      active: true,
    }).toEqual(data)
  })

  it('should create a model', async () => {
    const factory = new EntityFactory(Test, castTest)

    const payload = {
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis I',
      active: true,
      something: 'strange',
      complex: {
        title: 'ComplexTitle',
      },
    }

    const item = await factory.create(payload)

    item.setIsModified(true)
    expect(item.isModified()).toBeTruthy()

    item.setIsModified(false)
    expect(item.isModified()).not.toBeTruthy()

    const data = item.getData()

    expect({
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis I',
      body: '',
      object: {},
      active: true,
    }).toEqual(data)
  })

  it('Test Entity set partial data', async () => {
    const factory = new EntityFactory(Test, castTest)
    const item = await factory.create({
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis I',
    })

    expect(item).toEqual({
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis I',
      body: '',
      object: {},
      active: false,
    })

    item.setData({
      title: 'The Fundamentals of Mathematical Analysis II',
    })

    expect(item).toEqual({
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis II',
      body: '',
      object: {},
      active: false,
    })
  })

  it('should clone payload on entity creation', async () => {
    const factory = new EntityFactory(Test, castTest)

    const payload = {
      id: 1,
      title: 'test',
      body: '',
      active: 1,
      object: {
        id: 2,
      },
    }

    const item = await factory.create(payload)
    payload.object.id = 3

    expect({
      id: 1,
      title: 'Test',
      body: '',
      active: true,
      object: {
        id: 2,
      },
    }).toEqual(item.getData())
  })

  it('should convert nullish (null) to empty', async () => {
    const factory = new EntityFactory(Test, castTest)

    const payload = {
      id: 1,
      title: 'test',
      body: null,
      active: 1,
      object: {},
    }

    const item = await factory.create(payload)

    expect({
      id: 1,
      title: 'Test',
      body: '',
      active: true,
      object: {},
    }).toEqual(item.getData())
  })

  it('should convert nullish (undefined) to empty', async () => {
    const factory = new EntityFactory(Test, castTest)

    const payload = {
      id: 1,
      title: 'test',
      active: 1,
      object: {},
    }

    const item = await factory.create(payload)

    expect({
      id: 1,
      title: 'Test',
      body: '',
      active: true,
      object: {},
    }).toEqual(item.getData())
  })
})
