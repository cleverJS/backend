import path from 'path'
import { App } from './App'
import { logger } from '../core/logger/logger'
import { destroy } from '../core/utils/destroy'
import { settings } from './configs'
import { ILoggerConfig } from '../core/logger/config'
import { TransportWinston } from '../core/logger/transport/TransportWinston'

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
