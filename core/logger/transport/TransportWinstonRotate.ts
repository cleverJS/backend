import fs from 'fs'
import { createLogger, format, Logform, Logger, transports } from 'winston'
import type DailyRotateFile from 'winston-daily-rotate-file'

import { argsStringify, createArgsStringify } from '../argsStringify'

import { definedLimits } from './limits'
import { LogLevel, TransportInterface } from './TransportInterface'
import { buildStructuredEntry, ITransportWinstonConfig, resolveLogLevel, structuredLogFormat } from './TransportWinston'

export interface ITransportWinstonRotateConfig extends ITransportWinstonConfig {
  /** Prefix of every file this transport writes; a tag in each line, or a `namespace` field in structured mode. */
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

// `limits` is left out rather than defaulted: no value here means the shared serialiser, and any
// default would replace it with a private copy for every instance.
const DEFAULTS: Required<Omit<ITransportWinstonRotateConfig, 'limits'>> = {
  namespace: 'app',
  maxSize: '20m',
  maxFiles: '30d',
  datePattern: 'yyyy-MM-DD',
  zippedArchive: true,
  utc: true,
  handleProcessEvents: true,
  console: true,
  structured: false,
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
  protected readonly structured: boolean
  protected readonly stringify: (...args: unknown[]) => string

  public constructor(logDir: string, config: ITransportWinstonRotateConfig = {}) {
    // Everything destructured by name is ours; `rotation` is what reaches `DailyRotateFile`, and an
    // option it does not know would be carried into its options object unchanged.
    const { namespace, handleProcessEvents, console: withConsole, structured, limits, ...rotation } = { ...DEFAULTS, ...config }

    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    this.structured = structured
    this.stringify = limits === undefined ? argsStringify : createArgsStringify(definedLimits(limits))

    // Structured mode drops the line template: the namespace becomes a field via `defaultMeta`, and the
    // whole chain sits on the logger so a record is serialised once instead of once per transport.
    const logFormat = structured
      ? undefined
      : format.printf((info) => {
          return `${info.timestamp} [${info.level}][${namespace}] ${info.message}`
        })

    const rotate = (filename: string, level: string) =>
      this.buildRotateTransport({ ...rotation, dirname: logDir, filename, level, handleProcessEvents, logFormat })

    const fileTransports = [
      // `error` holds failures only. `info` is the combined file: winston hands a record to every
      // transport whose level is at or below it in severity, so errors land in both.
      rotate(`${namespace}-error-%DATE%.log`, 'error'),
      rotate(`${namespace}-info-%DATE%.log`, 'info'),
    ]

    this.logger = createLogger({
      level: resolveLogLevel(),
      format: structured ? structuredLogFormat() : undefined,
      defaultMeta: structured ? { namespace } : undefined,
      transports: withConsole
        ? [
            ...fileTransports,
            new transports.Console({
              handleExceptions: handleProcessEvents,
              handleRejections: handleProcessEvents,
              // `colorize` rewrites `info.level` in place, so its escape codes would land inside the JSON.
              format: logFormat === undefined ? undefined : format.combine(format.timestamp(), format.colorize(), logFormat),
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
      // Winston filters by level inside its transports, after the record has been built and pushed through
      // the logger format — so without this a discarded `debug` still pays for the whole serialisation.
      if (!this.logger.isLevelEnabled(level)) {
        return
      }

      this.logger.log(this.structured ? buildStructuredEntry(level, msg) : { level, message: this.stringify(...msg) })
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e)
    }
  }

  protected buildRotateTransport(params: {
    dirname: string
    filename: string
    level: string
    logFormat: Logform.Format | undefined
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
      format: logFormat === undefined ? undefined : format.combine(format.timestamp(), logFormat),
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
