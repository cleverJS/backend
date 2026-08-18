import fs from 'fs'
import { createLogger, format, Logform, Logger, transports } from 'winston'

import { argsStringify, createArgsStringify, IArgsStringifyLimits } from '../argsStringify'

import { definedLimits } from './limits'
import { LogLevel, TransportInterface } from './TransportInterface'

export interface ITransportWinstonConfig {
  /**
   * Hand winston the arguments as they arrived and let `format.json()` serialise them, so every line is
   * a JSON object with queryable fields instead of one flattened string.
   *
   * Off by default, and it has to stay that way: the flattened form is what existing consumers parse.
   */
  structured?: boolean

  /**
   * Overrides for the serialiser's bounds, merged over `ARGS_STRINGIFY_LIMITS`. For an aggregator
   * that truncates or drops a line past some size, `argChars` and `totalChars` are the two that matter.
   *
   * Left out, the transport shares the process-wide serialiser rather than building an identical one.
   * Ignored in structured mode, which does not go through that serialiser and carries its own bound.
   */
  limits?: Partial<IArgsStringifyLimits>
}

/** Shaped after winston's own `LogEntry`, which is what `Logger.log()` accepts. */
export interface IStructuredLogEntry {
  level: LogLevel
  message: any
  details?: unknown[]
}

/** A `cause` chain longer than this is a cycle often enough that following it further is not worth it. */
const MAX_CAUSE_DEPTH = 3

/**
 * Characters structured mode is willing to hand winston for one record.
 *
 * A single record at or above a File transport's `maxsize` makes winston write nothing at all — not that
 * record, not the healthy ones behind it, and without surfacing an error. The default path is bounded by
 * `argsStringify`; structured mode has to bound itself, and it cannot borrow that bound because the two
 * modes serialise differently.
 */
const MAX_STRUCTURED_LENGTH = 65536

/**
 * Nesting the walk below will descend. Deeper than a log record has reason to be, and shallow enough that
 * a chain built by accident cannot exhaust the call stack before the budget stops it.
 */
const MAX_NESTING_DEPTH = 32

/** The same marker the default path uses for a value it could not read, so both modes read alike. */
const UNREADABLE = '[Unreadable]'

/** What `safe-stable-stringify` writes for a repeat on the holder path; the clone has to match it exactly. */
const CIRCULAR = '[Circular]'

const NESTING_TRUNCATED = '[Nesting truncated]'
const CAUSE_TRUNCATED = '[Cause chain truncated]'

/** A JSON string costs its quotes, and a key costs its quotes too. */
const QUOTE_COST = 2

const HIGH_SURROGATE_MIN = 0xd800
const HIGH_SURROGATE_MAX = 0xdbff

/** One record's remaining allowance, consumed left to right across `message` and then `details`. */
interface IStructuredBudget {
  left: number
}

/** What the walk below carries: what it may still spend, where it stands, and whether it changed anything. */
interface IPrepareState {
  left: number
  depth: number
  /** The holder path — the check `safe-stable-stringify` performs — rather than every object seen so far. */
  holders: Set<object>
  /** Set once the clone stops serialising like its original, which is when the original may not be reused. */
  changed: boolean
}

/** A clone winston can be handed, and the exact text `format.json()` will write for it. */
interface IMeasured {
  value: unknown
  text: string
  faithful: boolean
}

/**
 * A cut between the halves of a surrogate pair reaches a UTF-8 file as U+FFFD, so the pair goes whole.
 *
 * The marker counts against the same allowance: a caller that asked for `limit` characters gets at most
 * `limit` back, marker included.
 */
const clip = (value: string, limit: number): string => {
  if (value.length <= limit) {
    return value
  }

  const room = Math.max(limit - `...[truncated ${value.length} chars]`.length, 0)
  const lastKept = value.charCodeAt(room - 1)
  const end = lastKept >= HIGH_SURROGATE_MIN && lastKept <= HIGH_SURROGATE_MAX ? room - 1 : room

  return `${value.slice(0, end)}...[truncated ${value.length - end} chars]`
}

/** `instanceof` throws on a revoked proxy, which is exactly the input this path has to survive. */
const isError = (value: unknown): value is Error => {
  try {
    return value instanceof Error
  } catch {
    return false
  }
}

const readSafely = <T>(read: () => T): T | undefined => {
  try {
    return read()
  } catch {
    return undefined
  }
}

/** Read off the `Error` itself, so anything attached to it cannot take their place in the record. */
const ERROR_FIELDS = new Set(['name', 'message', 'stack', 'cause'])

/** Marked rather than dropped: a reader has to tell a cause that was not followed from an error with none. */
const causeAtLimit = (cause: unknown): unknown => (cause === undefined || cause === null ? cause : CAUSE_TRUNCATED)

const attachedProperties = (value: Error): Record<string, unknown> => {
  const own = readSafely(() => ({ ...value })) ?? {}

  return Object.fromEntries(Object.entries(own).filter(([key]) => !ERROR_FIELDS.has(key)))
}

/**
 * An `Error` has no enumerable own properties, so `safe-stable-stringify` inside `format.json()` renders
 * a nested one as `{}` — losing the message, the stack and everything else that makes it worth logging.
 *
 * Every read is guarded on its own: the spread runs getters, and so do `stack` and `cause`, so one hostile
 * getter costs its own field rather than the record it belongs to. What identifies the error is written
 * first, because the budget is spent left to right and an error whose message was crowded out by its own
 * attached properties is not worth writing.
 */
const flattenError = (value: unknown, depth = 0): unknown => {
  if (!isError(value)) {
    return value
  }

  const cause = readSafely(() => value.cause)

  return {
    name: readSafely(() => value.name),
    message: readSafely(() => value.message) ?? UNREADABLE,
    stack: readSafely(() => value.stack),
    cause: depth < MAX_CAUSE_DEPTH ? flattenError(cause, depth + 1) : causeAtLimit(cause),
    ...attachedProperties(value),
  }
}

const prepareString = (value: string, state: IPrepareState): string => {
  const limit = state.left - QUOTE_COST

  if (value.length <= limit) {
    state.left -= value.length + QUOTE_COST

    return value
  }

  state.changed = true
  state.left = 0

  return clip(value, Math.max(limit, 0))
}

/** Reading a property runs a getter, so one hostile getter costs its own field rather than the record. */
const prepareProperty = (holder: object, key: string, state: IPrepareState): unknown => {
  try {
    return prepareValue(Reflect.get(holder, key), state)
  } catch {
    state.changed = true
    state.left -= UNREADABLE.length

    return UNREADABLE
  }
}

const prepareArray = (value: unknown[], state: IPrepareState): unknown[] => {
  const result: unknown[] = []

  for (let index = 0; index < value.length; index += 1) {
    if (state.left <= 0) {
      state.changed = true
      result.push(`...[truncated ${value.length - index} items]`)
      break
    }

    state.left -= 1
    result.push(prepareProperty(value, String(index), state))
  }

  return result
}

const prepareRecord = (value: object, state: IPrepareState): Record<string, unknown> => {
  const keys = Object.keys(value)
  const entries: [string, unknown][] = []

  for (const [index, key] of keys.entries()) {
    if (state.left <= 0) {
      state.changed = true
      entries.push(['...', `truncated ${keys.length - index} keys`])
      break
    }

    state.left -= key.length + QUOTE_COST
    entries.push([key, prepareProperty(value, key, state)])
  }

  return Object.fromEntries(entries)
}

/** Both serialisers call `toJSON`, so the clone calls it once and keeps what it returned. */
const readToJson = (value: object): (() => unknown) | undefined => {
  try {
    const toJson: unknown = Reflect.get(value, 'toJSON')

    return typeof toJson === 'function' ? () => (toJson as (key?: string) => unknown).call(value) : undefined
  } catch {
    return undefined
  }
}

const prepareObject = (value: object, state: IPrepareState): unknown => {
  if (isError(value)) {
    state.changed = true

    return prepareValue(flattenError(value), state)
  }

  const toJson = readToJson(value)

  if (toJson !== undefined) {
    return prepareValue(toJson(), state)
  }

  return Array.isArray(value) ? prepareArray(value, state) : prepareRecord(value, state)
}

/**
 * A tree winston can be handed in place of the original: cycles resolved against the holder path the way
 * `safe-stable-stringify` resolves them, `Error` flattened wherever it sits, and every branch cut once the
 * allowance runs out.
 */
const prepareValue = (value: unknown, state: IPrepareState): unknown => {
  if (typeof value === 'string') {
    return prepareString(value, state)
  }

  if (typeof value !== 'object' || value === null) {
    state.left -= 1

    return value
  }

  if (state.holders.has(value)) {
    return CIRCULAR
  }

  if (state.depth >= MAX_NESTING_DEPTH) {
    state.changed = true

    return NESTING_TRUNCATED
  }

  state.holders.add(value)
  state.depth += 1

  try {
    return prepareObject(value, state)
  } catch {
    state.changed = true
    state.left -= UNREADABLE.length

    return UNREADABLE
  } finally {
    state.holders.delete(value)
    state.depth -= 1
  }
}

/**
 * `null` when the value cannot be serialised at all — a `BigInt`, or whatever a `toJSON` handed back.
 *
 * The clone is a tree, so `JSON.stringify` here and the `safe-stable-stringify` inside `format.json()` walk
 * it identically and write the same number of characters. Measuring the original could not promise that:
 * a value referenced from two places is one node to a seen-anywhere check and two to a holder-path one, and
 * winston uses the latter — which is how a record that measured as 32 KB reached the file as 6 MB, and how
 * a File transport at `maxsize` answered by writing nothing at all.
 */
const measure = (value: unknown, limit: number): IMeasured | null => {
  const state: IPrepareState = { left: limit, depth: 0, holders: new Set(), changed: false }
  const prepared = prepareValue(value, state)

  try {
    return { value: prepared, text: JSON.stringify(prepared) ?? '', faithful: !state.changed }
  } catch {
    return null
  }
}

/**
 * The walk spends an estimate and the serialiser has the last word; taking the observed excess off the
 * allowance and walking once more keeps an oversize value a structured object instead of an escaped string.
 */
const fit = (value: unknown, limit: number): IMeasured | null => {
  const measured = measure(value, limit)

  if (measured === null || measured.text.length <= limit) {
    return measured
  }

  return measure(value, limit - (measured.text.length - limit)) ?? measured
}

/** Hands winston the clone that was measured, never the original it was measured from. */
const bounded = (value: unknown, budget: IStructuredBudget): unknown => {
  const measured = fit(value, budget.left)

  if (measured === null) {
    budget.left -= UNREADABLE.length

    return UNREADABLE
  }

  if (measured.text.length <= budget.left) {
    budget.left -= measured.text.length

    return measured.value
  }

  const clipped = clip(measured.text, Math.max(budget.left, 0))
  budget.left = 0

  return clipped
}

/** Exactly the reads `format.errors` performs, so a hostile getter throws here instead of inside winston. */
const winstonHeadSize = (value: Error, limit: number): number | null => {
  try {
    const measured = measure({ ...value, message: value.message, stack: value.stack, cause: flattenError(value.cause) }, limit)

    // An unfaithful clone measured something winston will not write — a nested `Error`, a clipped string —
    // so the size it reports says nothing about the original.
    return measured === null || !measured.faithful ? null : measured.text.length
  } catch {
    return null
  }
}

/**
 * `format.errors` spreads the head argument and reads its `stack` and `cause` inside winston's own format
 * chain, where a getter that throws unwinds past `Logger.log()` and the record is dropped on the floor.
 */
const structuredHead = (value: unknown, budget: IStructuredBudget): unknown => {
  if (!isError(value)) {
    return bounded(value, budget)
  }

  const size = winstonHeadSize(value, budget.left)

  // Handing winston the `Error` itself is what produces the flat `message`/`stack`/`cause` fields, so it
  // stays the preferred form — but only once those reads have been shown here to be safe, to fit, and to
  // serialise the way the clone they were measured on did.
  if (size !== null && size <= budget.left) {
    budget.left -= size

    return value
  }

  return bounded(value, budget)
}

/** Past the budget each remaining detail would still cost a marker of its own, so they collapse into one. */
const boundedDetails = (items: unknown[], budget: IStructuredBudget): unknown[] => {
  const details: unknown[] = []

  for (const [index, item] of items.entries()) {
    if (budget.left <= 0) {
      details.push(`...[truncated ${items.length - index} details]`)
      break
    }

    // The comma `format.json()` puts between two details is the caller's to pay for; unpaid it is one
    // character per argument, which is what let sixty thousand of them run past the budget.
    budget.left -= 1
    details.push(bounded(item, budget))
  }

  return details
}

/** `format.errors({ cause: true })` copies the cause across as the `Error` it is, and JSON renders that `{}`. */
const flattenCauseFormat = format((info) => {
  try {
    if (isError(info.cause)) {
      info.cause = flattenError(info.cause)
    }
  } catch {
    info.cause = UNREADABLE
  }

  return info
})

/** One JSON object per line, with `Error` unwrapped by winston rather than rendered as `{}`. */
export const structuredLogFormat = (): Logform.Format =>
  format.combine(format.errors({ stack: true, cause: true }), flattenCauseFormat(), format.timestamp(), format.json())

/**
 * The first argument stays in `message`, which is the only place `format.errors` looks; everything after
 * it becomes `details`, where an `Error` has to be flattened by hand for the same reason.
 */
export const buildStructuredEntry = (level: LogLevel, msg: unknown[]): IStructuredLogEntry => {
  const [head, ...rest] = msg
  const budget: IStructuredBudget = { left: MAX_STRUCTURED_LENGTH }
  const message = structuredHead(head, budget)

  if (rest.length === 0) {
    return { level, message }
  }

  return { level, message, details: boundedDetails(rest, budget) }
}

/** `APP_DEBUG=true` keeps `debug` on in production. Shared so the two winston transports cannot drift apart. */
export const resolveLogLevel = (): string => {
  const appDebug = (process.env.APP_DEBUG || 'false') === 'true'

  return process.env.NODE_ENV === 'production' && !appDebug ? 'info' : 'debug'
}

export class TransportWinston implements TransportInterface {
  protected readonly logger: Logger
  protected readonly structured: boolean
  protected readonly stringify: (...args: unknown[]) => string

  public constructor(logDir: string, config: ITransportWinstonConfig = {}) {
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true })
    }

    this.structured = config.structured === true
    this.stringify = config.limits === undefined ? argsStringify : createArgsStringify(definedLimits(config.limits))

    const logFormat = format.printf((info) => {
      return `${info.timestamp} ${info.level}: ${info.message}`
    })

    // Structured mode keeps the whole chain on the logger, so a record is serialised once instead of once
    // per transport; each transport then writes the JSON the logger already produced.
    const fileFormat = this.structured ? undefined : format.combine(format.timestamp(), format.prettyPrint(), logFormat)
    // No `colorize` in structured mode: it rewrites `info.level` in place, and the escape codes would end
    // up inside the JSON field.
    const consoleFormat = this.structured ? undefined : format.combine(format.timestamp(), format.prettyPrint(), format.colorize(), logFormat)

    this.logger = createLogger({
      level: resolveLogLevel(),
      format: this.structured ? structuredLogFormat() : format.json(),
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
          format: fileFormat,
        }),
        new transports.File({
          filename: `${logDir}/combined.log`,
          handleExceptions: true,
          maxsize: 5242880, // 5MB
          maxFiles: 5,
          format: fileFormat,
        }),
        new transports.Console({
          handleExceptions: true,
          format: consoleFormat,
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
}
