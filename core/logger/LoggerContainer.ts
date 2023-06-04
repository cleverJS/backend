import { ILoggerWrapper, Logger } from './logger'

export class LoggerContainer {
  private static instance: LoggerContainer
  private loggers: Map<string, Logger> = new Map()

  private constructor() {}

  public static getInstance() {
    if (!LoggerContainer.instance) {
      LoggerContainer.instance = new LoggerContainer()
    }

    return LoggerContainer.instance
  }

  public addLogger(name: string, logger: Logger) {
    this.loggers.set(name, logger)
  }

  public getLoggerWrapper(
    name: string,
    options?: {
      wrapper?: (logger: Logger, ...args: any[]) => ILoggerWrapper
      params?: any
    }
  ): ILoggerWrapper {
    const logger = this.loggers.get(name)

    if (!logger) {
      throw new Error(`No logger ${name}`)
    }

    return options?.wrapper ? options.wrapper(logger, options.params) : this.defaultWrapper(logger, options?.params || 'Global')
  }

  protected defaultWrapper(logger: Logger, ...args: any[]) {
    const [namespace] = args

    return {
      debug(...msg: any[]) {
        logger.debug(`[${namespace}]`, ...msg)
      },
      info(...msg: any[]) {
        logger.info(`[${namespace}]`, ...msg)
      },
      warn(...msg: any[]) {
        logger.warn(`[${namespace}]`, ...msg)
      },
      error(...msg: any[]) {
        logger.error(`[${namespace}]`, ...msg)
      },
    }
  }
}
