import { v4 as uuidV4 } from 'uuid'

import { ILoggerConfig } from './config'
import { LogLevel, TransportInterface } from './transport/TransportInterface'

export class Logger {
  protected config?: ILoggerConfig
  protected transports: Map<string, TransportInterface> = new Map()

  public constructor(config?: ILoggerConfig) {
    this.setConfig(config)
  }

  public setConfig(config?: ILoggerConfig) {
    this.config = config
  }

  /**
   * @param transport
   * @param code
   */
  public addTransport(transport: TransportInterface, code?: string) {
    if (!code) {
      code = uuidV4()
    }
    this.transports.set(code, transport)
  }

  /**
   * @param msg
   */
  public debug = (...msg: any[]) => {
    if (this.config && this.config.debug) {
      this.log(null, 'debug', ...msg)
    }
  }

  /**
   * @param msg
   */
  public info = (...msg: any[]) => {
    if (this.config && this.config.info) {
      this.log(null, 'info', ...msg)
    }
  }

  /**
   * @param msg
   */
  public warn = (...msg: any[]) => {
    if (this.config && this.config.warn) {
      this.log(null, 'warn', ...msg)
    }
  }

  /**
   * @param msg
   */
  public error = (...msg: any[]) => this.log(null, 'error', ...msg)

  /**
   * @param transportCode
   * @param level
   * @param msg
   */
  public log(transportCode: string | null, level: LogLevel, ...msg: any[]) {
    if (transportCode) {
      const transport = this.transports.get(transportCode)
      if (transport) {
        transport.log(level, ...msg)
      }
    } else {
      for (const transport of this.transports.values()) {
        transport.log(level, ...msg)
      }
    }
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
