import winston, { format } from 'winston'

import { LogLevel, TransportInterface } from '../../../core/logger/transport/TransportInterface'
import { argsStringify } from '../../../core/utils/common'

export class TransportWinstonConsole implements TransportInterface {
  protected readonly logger: winston.Logger

  public constructor() {
    const logFormat = format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message}`
    })

    this.logger = winston.createLogger({
      level: 'debug',
      format: winston.format.json(),
      transports: [
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
