import fs from 'fs'
import { createLogger, format, Logger, transports } from 'winston'

import { argsStringify } from '../../utils/common'

import { LogLevel, TransportInterface } from './TransportInterface'

export class TransportWinston implements TransportInterface {
  protected readonly logger: Logger

  public constructor(logDir: string) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const logFormat = format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message}`
    })

    const appDebug = (process.env.APP_DEBUG || 'false') === 'true'

    this.logger = createLogger({
      level: process.env.NODE_ENV === 'production' && !appDebug ? 'info' : 'debug',
      format: format.json(),
      transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new transports.File({
          filename: `${logDir}/error.log`,
          handleExceptions: true,
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: format.combine(format.timestamp(), format.prettyPrint(), logFormat),
        }),
        new transports.File({
          filename: `${logDir}/combined.log`,
          handleExceptions: true,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: format.combine(format.timestamp(), format.prettyPrint(), logFormat),
        }),
        new transports.Console({
          handleExceptions: true,
          format: format.combine(format.timestamp(), format.prettyPrint(), format.colorize(), logFormat),
        }),
      ],
      exitOnError: false, // do not exit on handled exceptions
    })
  }

  /**
   * @param level
   * @param msg
   */
  public log(level: LogLevel, ...msg: any[]): void {
    try {
      this.logger.log({
        level,
        message: argsStringify(...msg),
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }
}
