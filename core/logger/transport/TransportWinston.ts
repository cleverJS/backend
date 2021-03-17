import winston, { format } from 'winston'
import * as fs from 'fs'
import { LogLevel, TransportInterface } from './TransportInterface'

export class TransportWinston implements TransportInterface {
  protected readonly logger: winston.Logger

  public constructor(logDir: string) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const logFormat = format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message}`
    })

    const appDebug = (process.env.APP_DEBUG || 'false') === 'true'

    this.logger = winston.createLogger({
      level: process.env.NODE_ENV === 'production' && !appDebug ? 'info' : 'debug',
      format: winston.format.json(),
      transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new winston.transports.File({
          filename: `${logDir}/error.log`,
          handleExceptions: true,
          level: 'error',
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: format.combine(format.timestamp(), format.prettyPrint(), logFormat),
        }),
        new winston.transports.File({
          filename: `${logDir}/combined.log`,
          handleExceptions: true,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: format.combine(format.timestamp(), format.prettyPrint(), logFormat),
        }),
        new winston.transports.Console({
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
      const message = msg.reduce((prev, current, index) => {
        let space = ' '
        let carryover = '\n'
        if (index === 0) {
          space = ''
          carryover = ''
        }

        let messageNext = prev
        if (['string', 'number', 'boolean'].includes(typeof current)) {
          messageNext += `${space}${current}`
        } else if (current instanceof Error) {
          const { stack, ...other } = current
          messageNext += `${carryover}${JSON.stringify(other)}\n`
          messageNext += `${carryover}[Stack trace]: ${stack}`
        } else {
          messageNext += `${carryover}${JSON.stringify(current, null, 4)}\n`
        }

        return messageNext
      }, '')

      this.logger.log({
        level,
        message,
      })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }
}
