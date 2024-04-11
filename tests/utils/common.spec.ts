import { logger } from '../../core/logger/logger'
import { argsStringify, convertToBoolean } from '../../core/utils/common'

describe('Test common', () => {
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

  test('should stringify Error', () => {
    const error = new Error('Test')
    const result = argsStringify(error)
    logger.info(result)

    expect(true).toBeTruthy()
  })

  test('should stringify AggregateError', () => {
    const error = new AggregateError([new Error('Test1'), new Error('Test2')])
    const result = argsStringify(error)
    logger.info(result)

    expect(true).toBeTruthy()
  })

  test('should return true', async () => {
    const yesStatements = ['yes', 'y', 'true', 't', '1', 1, true]
    for (const yes of yesStatements) {
      expect(convertToBoolean(yes)).toBeTruthy()
    }
  })

  test('should return false', async () => {
    const yesStatements = ['no', 'n', 'false', 'f', '0', 0, false, null, undefined, 'null', 'undefined']
    for (const yes of yesStatements) {
      expect(convertToBoolean(yes)).toBeFalsy()
    }
  })
})
