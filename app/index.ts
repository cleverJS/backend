import { App } from './App'
import { logger } from '../core/logger/logger'
import { TransportConsole } from '../core/logger/transport/TransportConsole'
import { destroy } from '../core/utils/destroy'
import { settings } from './configs'

logger.setConfig({
  debug: false,
  info: true,
  warn: true,
})
logger.addTransport(new TransportConsole())
const app = new App(settings)
logger.debug('+++++ Application init ++++++')

destroy(app.destroy(), 3000)
