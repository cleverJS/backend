import 'jest-extended'
import path from 'path'

import { ILoggerConfig } from '../../core/logger/config'
import { logger } from '../../core/logger/logger'
import { FSWrapper } from '../../core/utils/fsWrapper'

import { TransportWinstonConsole } from './libs/TransportWinstonConsole'

beforeAll(async () => {
  initLogger()
  recreateDB()
})

beforeEach(async () => {})

afterAll(async () => {})

function recreateDB() {
  const dirname = path.resolve()
  const file = path.resolve(`${dirname}/runtime/db.sqlite`)
  FSWrapper.removeSync(file)
  FSWrapper.createFileSync(file)
}

function initLogger() {
  logger.setConfig({
    debug: true,
    info: true,
    warn: true,
  } as ILoggerConfig)
  logger.addTransport(new TransportWinstonConsole())
}
