import { Buffer } from 'buffer'

import { EntityFactory } from '../../core/entity/EntityFactory'

import { castTestEntity, TestEntity } from './TestEntity'

const TEST_ENTITY_DATE = new Date('2022-11-30T11:37:25.708Z')
const TITLE_I = 'The Fundamentals of Mathematical Analysis I'

describe('Test EntityFactory', () => {
  it('should create a model with non empty title', async () => {
    const factory = new EntityFactory(TestEntity, castTestEntity)

    const payload = {
      id: '1',
      title: TITLE_I,
      active: 1,
    }

    const item = await factory.create(payload)

    const data = item.getData()

    expect(data).toEqual({
      id: 1,
      title: TITLE_I,
      body: '',
      object: {},
      active: true,
      buffer: Buffer.from('ABC'),
      date: TEST_ENTITY_DATE,
    })
  })

  it('should create a model', async () => {
    const factory = new EntityFactory(TestEntity, castTestEntity)

    const payload = {
      id: 1,
      title: TITLE_I,
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

    expect(data).toEqual({
      id: 1,
      title: TITLE_I,
      body: '',
      object: {},
      active: true,
      buffer: Buffer.from('ABC'),
      date: TEST_ENTITY_DATE,
    })
  })

  it('Test Entity set partial data', async () => {
    const factory = new EntityFactory(TestEntity, castTestEntity)
    const item = await factory.create({
      id: 1,
      title: TITLE_I,
    })

    expect(item).toEqual({
      id: 1,
      title: TITLE_I,
      body: '',
      object: {},
      active: false,
      buffer: Buffer.from('ABC'),
      date: TEST_ENTITY_DATE,
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
      buffer: Buffer.from('ABC'),
      date: TEST_ENTITY_DATE,
    })
  })

  it('should clone payload on entity creation', async () => {
    const factory = new EntityFactory(TestEntity, castTestEntity)

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

    expect(item.getData()).toEqual({
      id: 1,
      title: 'Test',
      body: '',
      active: true,
      object: {
        id: 2,
      },
      buffer: Buffer.from('ABC'),
      date: TEST_ENTITY_DATE,
    })
  })

  it('should convert nullish (null) to empty', async () => {
    const factory = new EntityFactory(TestEntity, castTestEntity)

    const payload = {
      id: 1,
      title: 'test',
      body: null,
      active: 1,
      object: {},
    }

    const item = await factory.create(payload)

    expect(item.getData()).toEqual({
      id: 1,
      title: 'Test',
      body: '',
      active: true,
      object: {},
      buffer: Buffer.from('ABC'),
      date: TEST_ENTITY_DATE,
    })
  })

  it('should convert nullish (undefined) to empty', async () => {
    const factory = new EntityFactory(TestEntity, castTestEntity)

    const payload = {
      id: 1,
      title: 'test',
      active: 1,
      object: {},
    }

    const item = await factory.create(payload)

    expect(item.getData()).toEqual({
      id: 1,
      title: 'Test',
      body: '',
      active: true,
      object: {},
      buffer: Buffer.from('ABC'),
      date: TEST_ENTITY_DATE,
    })
  })
})
