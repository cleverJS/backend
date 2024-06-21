// eslint-disable-next-line max-classes-per-file
import { Cloner } from '../../core/utils/clone/Cloner'
import { ICloneable } from '../../core/utils/clone/ICloneable'

describe('Check Cloneable', () => {
  test('returns false for an object with methods', () => {
    const obj = {
      foo: function () {},
      bar: 42,
    }

    expect(Cloner.isCloneable(obj)).toBe(false)
  })

  test('returns true for an Set', () => {
    const obj = new Set([1])

    expect(Cloner.isCloneable(obj)).toBe(true)
  })

  test('returns true for an Map', () => {
    const obj = new Map([[1, 2]])

    expect(Cloner.isCloneable(obj)).toBe(true)
  })

  test('returns true for an object without methods', () => {
    const obj = {
      foo: 42,
      bar: 'hello',
    }
    expect(Cloner.isCloneable(obj)).toBe(true)
  })

  test('returns true for an empty object', () => {
    const obj = {}
    expect(Cloner.isCloneable(obj)).toBe(true)
  })

  test('returns false for an object with inherited methods', () => {
    class Parent {
      public parentMethod() {
        return 'foo'
      }
    }

    class Child extends Parent {
      public childMethod() {
        return 'foo'
      }
    }

    const instance = new Child()
    expect(Cloner.isCloneable(instance)).toBe(false)
  })

  test('returns true for an object with implemented with ICloneable', () => {
    class Parent implements ICloneable {
      clone(nextData?: any): this {
        throw new Error('Method not implemented.')
      }

      public parentMethod() {
        return 'foo'
      }
    }

    const instance = new Parent()
    expect(Cloner.isCloneable(instance)).toBe(true)
  })

  test('returns false for null', () => {
    expect(Cloner.isCloneable(null)).toBe(true)
  })

  test('returns true for primitive types', () => {
    expect(Cloner.isCloneable(42)).toBe(true)
    expect(Cloner.isCloneable('hello')).toBe(true)
    expect(Cloner.isCloneable(true)).toBe(true)
    expect(Cloner.isCloneable(Symbol('symbol'))).toBe(true)
    expect(Cloner.isCloneable(undefined)).toBe(true)
  })

  test('returns false for function objects', () => {
    const fn = () => {}
    fn.foo = () => {}
    expect(Cloner.isCloneable(fn)).toBe(false)
  })

  test('returns true for arrays with no methods', () => {
    const arr = [1, 2, 3]
    expect(Cloner.isCloneable(arr)).toBe(true)
  })

  test('returns false for arrays with methods', () => {
    const arr = [1, 2, 3, () => {}]
    expect(Cloner.isCloneable(arr)).toBe(false)
  })

  test('returns true for arrays with cloneable items', () => {
    class Parent implements ICloneable {
      clone(nextData?: any): this {
        throw new Error('Method not implemented.')
      }

      public parentMethod() {
        return 'foo'
      }
    }

    const instance = new Parent()

    const arr = [1, 2, 3, instance]
    expect(Cloner.isCloneable(arr)).toBe(true)
  })
})
