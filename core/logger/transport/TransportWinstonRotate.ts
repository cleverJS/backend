import fs from 'fs'
import { createLogger, format, Logform, Logger, transports } from 'winston'
import type DailyRotateFile from 'winston-daily-rotate-file'

import { argsStringify } from '../../utils/common'

import { LogLevel, TransportInterface } from './TransportInterface'

export interface ITransportWinstonRotateConfig {
  /** Prefix of every file this transport writes, and the tag in each line. */
  namespace?: string
  /** Size at which the current file rolls over: a byte count, or a number with a k/m/g suffix. */
  maxSize?: string | number
  /** Retention: a plain number keeps that many files, a `d` suffix keeps that many days. */
  maxFiles?: string | number
  /** moment.js pattern substituted into `%DATE%`. Coarser patterns rotate less often. */
  datePattern?: string
  /** Gzip a file once it has rolled over. */
  zippedArchive?: boolean
  /** Name files by UTC rather than by the server's local timezone. */
  utc?: boolean
  /**
   * Let this logger catch `uncaughtException` / `unhandledRejection`.
   *
   * Winston registers one process listener per logger, so a process that builds several
   * namespaced loggers must enable this on exactly one of them — otherwise it passes
   * Node's default MaxListeners (10) and writes every global error once per logger.
   */
  handleProcessEvents?: boolean
  /** Also write to stdout. Leave on under a process manager that captures it. */
  console?: boolean
}

const DEFAULTS: Required<ITransportWinstonRotateConfig> = {
  namespace: 'app',
  maxSize: '20m',
  maxFiles: '30d',
  datePattern: 'yyyy-MM-DD',
  zippedArchive: true,
  utc: true,
  handleProcessEvents: true,
  console: true,
}

/**
 * Winston transport that writes one file per day and per level — `<namespace>-error-<date>.log`
 * and `<namespace>-info-<date>.log` — gzips a file once it rolls over, and deletes it once it
 * falls outside the retention window.
 *
 * Use it instead of {@link TransportWinston} wherever logs are read by a human or shipped
 * somewhere: that one rotates by size into a fixed ring (`error.log`, `error1.log` … `error5.log`),
 * which is bounded on disk but not addressable by date — there is no way to ask it for a given
 * day, and the oldest file is dropped whenever traffic happens to fill the ring.
 *
 * Requires the optional peer `winston-daily-rotate-file`; it is loaded on construction, so a
 * service that never builds this transport does not need the package installed.
 *
 * Note this bounds only the files the process writes itself. Anything the `console` option sends
 * to stdout is the process manager's to rotate — under PM2 that means the `pm2-logrotate` module.
 */
export class TransportWinstonRotate implements TransportInterface {
  protected readonly logger: Logger

  public constructor(logDir: string, config: ITransportWinstonRotateConfig = {}) {
    const { namespace, handleProcessEvents, console: withConsole, ...rotation } = { ...DEFAULTS, ...config }

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    const logFormat = format.printf((info) => {
      return `${info.timestamp} [${info.level}][${namespace}] ${info.message}`
    })

    const appDebug = (process.env.APP_DEBUG || 'false') === 'true'
    const rotate = (filename: string, level: string) =>
      this.buildRotateTransport({ ...rotation, dirname: logDir, filename, level, handleProcessEvents, logFormat })

    const fileTransports = [
      // `error` holds failures only. `info` is the combined file: winston hands a record to every
      // transport whose level is at or below it in severity, so errors land in both.
      rotate(`${namespace}-error-%DATE%.log`, 'error'),
      rotate(`${namespace}-info-%DATE%.log`, 'info'),
    ]

    this.logger = createLogger({
      level: process.env.NODE_ENV === 'production' && !appDebug ? 'info' : 'debug',
      transports: withConsole
        ? [
            ...fileTransports,
            new transports.Console({
              handleExceptions: handleProcessEvents,
              handleRejections: handleProcessEvents,
              format: format.combine(format.timestamp(), format.colorize(), logFormat),
            }),
          ]
        : fileTransports,
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

  protected buildRotateTransport(params: {
    dirname: string
    filename: string
    level: string
    logFormat: Logform.Format
    handleProcessEvents: boolean
    maxSize: string | number
    maxFiles: string | number
    datePattern: string
    zippedArchive: boolean
    utc: boolean
  }): DailyRotateFile {
    const { dirname, filename, level, logFormat, handleProcessEvents, ...rotation } = params

    return new (this.resolveDailyRotateFile())({
      ...rotation,
      dirname,
      filename,
      level,
      handleExceptions: handleProcessEvents,
      handleRejections: handleProcessEvents,
      format: format.combine(format.timestamp(), logFormat),
    })
  }

  /**
   * Loaded here rather than imported at module scope on purpose: this file is re-exported from the
   * package root, so a top-level import would make an optional peer dependency mandatory for every
   * consumer of the package, whether or not they rotate logs.
   */
  protected resolveDailyRotateFile(): typeof DailyRotateFile {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      return require('winston-daily-rotate-file') as typeof DailyRotateFile
    } catch (e) {
      throw new Error("TransportWinstonRotate requires the optional peer dependency 'winston-daily-rotate-file'", { cause: e })
    }
  }
}
