import { logger } from '../logger/logger'

export const destroy = (destroyers: any[], timeout = 3000) => {
  let isDestroying = false

  function run(signal: string) {
    return async () => {
      if (!isDestroying) {
        isDestroying = true
        logger.info(`Signal ${signal}. Destroying app...`)
        setTimeout(() => {
          logger.warn('Destroy app timeout')
          // eslint-disable-next-line no-process-exit
          process.exit(1)
        }, timeout)
        await Promise.all(destroyers.map((d) => d()))
        logger.info('Destroy app successful')
        // eslint-disable-next-line no-process-exit
        process.exit(0)
      }
    }
  }

  process.on('SIGTERM', run('SIGTERM'))
  process.on('SIGINT', run('SIGINT'))
}
