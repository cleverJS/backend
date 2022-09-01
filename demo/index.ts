import path from 'path'

import { ILoggerConfig } from '../core/logger/config'
import { logger } from '../core/logger/logger'
import { TransportWinston } from '../core/logger/transport/TransportWinston'
import { destroy } from '../core/utils/destroy'

import { App } from './App'
import { settings } from './configs'

function initLogger() {
  const runtimeDir = path.resolve('./../runtime')
  logger.setConfig({
    debug: (process.env.APP_DEBUG || 'false') === 'true',
    info: true,
    warn: true,
  } as ILoggerConfig)
  logger.addTransport(new TransportWinston(runtimeDir))
}

initLogger()
logger.debug('enabled')
const app = new App(settings)
app
  .run()
  .then(() => {
    logger.info(`Application run in ${process.env.NODE_ENV} mode`)
  })
  .catch(logger.error)

destroy(app.destroy(), 30_000)
