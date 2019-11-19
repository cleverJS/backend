import { logger } from '../logger/logger'

export const destroy = (destroyers: any[], timeout = 3000) => {
  let isDestroying = false
  process.on('SIGTERM', destroy('SIGTERM'))
  process.on('SIGINT', destroy('SIGINT'))

  function destroy(signal: string) {
    return async () => {
      if (!isDestroying) {
        isDestroying = true
        logger.info(`Signal ${signal}. Destroying app...`)
        setTimeout(() => {
          logger.warn('Destroy app timeout')
          process.exit(1)
        }, timeout)
        await Promise.all(destroyers.map(d => d()))
        logger.info('Destroy app successful')
        process.exit(0)
      }
    }
  }
}
