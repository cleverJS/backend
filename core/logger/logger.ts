import { LogLevel, TransportInterface } from './transport/TransportInterface'
import { ILoggerConfig } from './config'

class Logger {
  protected config?: ILoggerConfig
  protected transports: TransportInterface[] = []

  public constructor(config?: ILoggerConfig) {
    this.setConfig(config)
  }

  public setConfig(config?: ILoggerConfig) {
    this.config = config
  }

  /**
   * @param transport
   */
  public addTransport(transport: TransportInterface) {
    this.transports.push(transport)
  }

  /**
   * @param msg
   */
  public debug = (...msg: any[]) => {
    if (this.config && this.config.debug) {
      this.log('debug', ...msg)
    }
  }

  /**
   * @param msg
   */
  public info = (...msg: any[]) => {
    if (this.config && this.config.info) {
      this.log('info', ...msg)
    }
  }

  /**
   * @param msg
   */
  public warn = (...msg: any[]) => {
    if (this.config && this.config.warn) {
      this.log('warn', ...msg)
    }
  }

  /**
   * @param msg
   */
  public error = (...msg: any[]) => this.log('error', ...msg)

  /**
   * @param level
   * @param msg
   */
  private log(level: LogLevel, ...msg: any[]) {
    this.transports.forEach((transport) => transport.log(level, ...msg))
  }
}

export const logger = new Logger()

export const loggerNamespace = (namespace: string) => ({
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
})
