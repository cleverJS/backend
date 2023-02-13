import { argsStringify } from '../../core/utils/common'

describe('Test', () => {
  test('should concatenate primitives', () => {
    const result = argsStringify('a', 'b', 1, false, undefined)
    expect(result).toEqual('a b 1 false undefined')
  })

  test('should stringify object', () => {
    const result = argsStringify({ a: 1, b: 2 })
    expect(result).toEqual('{"a":1,"b":2}')
  })

  test('should stringify object with circular dependencies', () => {
    const object1: Record<string, any> = {
      a: 1,
    }

    object1.b = object1

    const result = argsStringify(object1)
    expect(result).toEqual('{"a":1,"b":"[Circular Object]"}')
  })

  test('should stringify function', () => {
    const result = argsStringify(() => {})
    expect(result).toEqual('[Function]')
  })
})
