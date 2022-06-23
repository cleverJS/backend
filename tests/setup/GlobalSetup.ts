import { logger } from '../../core/logger/logger'
import { ILoggerConfig } from '../../core/logger/config'
import { TransportWinstonConsole } from './libs/TransportWinstonConsole'

beforeAll(async () => {
  initLogger()
})

beforeEach(async () => {})

afterAll(async () => {})

function initLogger() {
  logger.setConfig({
    debug: true,
    info: true,
    warn: true,
  } as ILoggerConfig)
  logger.addTransport(new TransportWinstonConsole())
}

