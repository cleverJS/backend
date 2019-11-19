import { LogLevel, TransportInterface } from './transport/TransportInterface'

class Logger {
  private transports: TransportInterface[] = []

  /**
   * @param transport
   */
  public addTransport(transport: TransportInterface) {
    this.transports.push(transport)
  }

  /**
   * @param msg
   */
  public debug = (...msg: any[]) => this.log('debug', ...msg)

  /**
   * @param msg
   */
  public info = (...msg: any[]) => this.log('info', ...msg)

  /**
   * @param msg
   */
  public warn = (...msg: any[]) => this.log('warn', ...msg)

  /**
   * @param msg
   */
  public error = (...msg: any[]) => this.log('error', ...msg)

  /**
   * @param level
   * @param msg
   */
  private log(level: LogLevel, ...msg: any[]) {
    this.transports.forEach(transport => transport.log(level, ...msg))
  }
}

export const logger = new Logger()

export const loggerNamespace = (namespace: string) => ({
  debug(...msg: any[]) { logger.debug(`[${namespace}]`, ...msg) },
  info(...msg: any[])  { logger.info(`[${namespace}]`, ...msg) },
  warn(...msg: any[])  { logger.warn(`[${namespace}]`, ...msg) },
  error(...msg: any[]) { logger.error(`[${namespace}]`, ...msg) },
})
