import { Cloner } from '../../core/utils/clone/Cloner'
import { JSONCloner } from '../../core/utils/clone/strategy/JSONCloner'
import { V8Cloner } from '../../core/utils/clone/strategy/V8Cloner'
import { TestEntity } from '../entity/TestEntity'

describe('Cloner', () => {
  function cloner(type: 'json' | 'v8') {
    const instance = Cloner.getInstance()
    if (type === 'json') {
      instance.setCloner(new JSONCloner())
    }

    if (type === 'v8') {
      instance.setCloner(new V8Cloner())
    }
    return instance
  }

  it('should keep Date type with V8Cloner', () => {
    const item = { date: new Date() }
    expect(item.date).toBeInstanceOf(Date)
    const clone = cloner('v8').clone(item)
    expect(clone.date).toBeInstanceOf(Date)
  })

  it('should clone Set', () => {
    const item = new Set([1])
    expect(item.size).toEqual(1)
    const clone = cloner('v8').clone(item)
    clone.clear()
    expect(item.size).toEqual(1)
    expect(clone.size).toEqual(0)
  })

  it('should keep Date type with JSONCloner', () => {
    const item = { date: new Date() }
    expect(item.date).toBeInstanceOf(Date)
    const clone = cloner('json').clone(item)
    expect(clone.date).toBeInstanceOf(Date)
  })

  it('should clone with V8Cloner', () => {
    const item = { a: 1, b: { ba: 1, bb: 2 }, c: Buffer.from('ABC') }
    const clone = cloner('v8').clone(item)

    item.a = 2
    item.b.bb = 10
    item.c = Buffer.from('CCC')

    expect(clone).toEqual({ a: 1, b: { ba: 1, bb: 2 }, c: Buffer.from('ABC') })
    expect(clone).not.toEqual(item)
  })

  it('should clone with JSONCloner', () => {
    const item = { a: 1, b: { ba: 1, bb: 2 }, c: Buffer.from('ABC') }

    const clone = cloner('json').clone(item)

    item.a = 2
    item.b.bb = 10
    item.c = Buffer.from('CCC')

    expect(clone).toEqual({ a: 1, b: { ba: 1, bb: 2 }, c: Buffer.from('ABC') })
    expect(clone).not.toEqual(item)
  })

  it('should clone Entity with V8Cloner', () => {
    cloner('v8')
    const item = new TestEntity()
    item.setData({ title: 'title1' })

    const clone = item.clone()

    item.title = 'title2'

    expect(clone).toBeInstanceOf(TestEntity)
    expect(clone.title).toEqual('title1')
    expect(item.title).toEqual('title2')
    expect(clone.date).toBeInstanceOf(Date)
  })

  it('should clone Entity with JSONCloner', () => {
    cloner('json')
    const item = new TestEntity()
    item.setData({ title: 'title1' })

    const clone = item.clone()

    item.title = 'title2'

    expect(clone).toBeInstanceOf(TestEntity)
    expect(clone.title).toEqual('title1')
    expect(item.title).toEqual('title2')
    expect(clone.date).toBeInstanceOf(Date)
  })
})
