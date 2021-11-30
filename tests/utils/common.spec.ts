import path from 'path'
import { logger } from '../../core/logger/logger'
import { ILoggerConfig } from '../../core/logger/config'
import { TransportWinston } from '../../core/logger/transport/TransportWinston'
import { argsStringify } from '../../core/utils/common'

function initLogger() {
  const runtimeDir = path.resolve(`${__dirname}/../../runtime/tests`)
  logger.setConfig({
    debug: true,
    info: true,
    warn: true,
  } as ILoggerConfig)
  logger.addTransport(new TransportWinston(runtimeDir))
}

describe('Test', () => {
  initLogger()

  test('should concatenate primitives', () => {
    const result = argsStringify('a', 'b', 1, false, undefined)
    expect(result).toEqual('a b 1 false undefined')
  })

  test('should stringify object', () => {
    const result = argsStringify({ a: 1, b: 2 })
    expect(result).toEqual('{\n    "a": 1,\n    "b": 2\n}')
  })

  test('should stringify object with circular dependencies', () => {
    const object1: Record<string, any> = {
      a: 1,
    }

    object1.b = object1

    const result = argsStringify(object1)
    expect(result).toEqual('{\n    "a": 1,\n    "b": "[Circular Object]"\n}')
  })

  // test('should stringify Error', () => {
  //   const result = argsStringify(new Error('a'))
  //   expect(result).toEqual('a')
  // })

  test('should stringify function', () => {
    const result = argsStringify(() => {})
    expect(result).toEqual('[Function]')
  })
})
