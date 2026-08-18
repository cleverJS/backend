import fs from 'fs'
import os from 'os'
import path from 'path'
import { Logger, transports } from 'winston'

import { ITransportWinstonConfig, TransportWinston } from '../../core/logger/transport/TransportWinston'

/** winston writes through a stream; give it a tick to reach the filesystem. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 250))
}

/** Neither the level check nor the format chain is observable without the logger the transport owns. */
interface IWinstonInternals {
  logger: Logger
}

interface IStructuredDetail {
  message?: string
  stack?: string
  [key: string]: unknown
}

interface IStructuredRecord {
  level: string
  message: string
  timestamp: string
  stack?: string
  cause?: { message?: string }
  details?: IStructuredDetail[]
}

/** `String.prototype.isWellFormed` is ES2024 and this project compiles against the ES2022 lib. */
interface IWellFormedString {
  isWellFormed(): boolean
}

function isWellFormed(value: string): boolean {
  return (value as unknown as IWellFormedString).isWellFormed()
}

const dirs: string[] = []

afterAll(() => {
  for (const dir of dirs) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

function internals(transport: TransportWinston): IWinstonInternals {
  return transport as unknown as IWinstonInternals
}

function logDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'transport-winston-'))
  dirs.push(dir)

  return dir
}

/** The console transport is not optional on this class; silencing it keeps the suite output readable. */
function build(dir: string, config: ITransportWinstonConfig = {}): TransportWinston {
  const transport = new TransportWinston(dir, config)

  for (const item of internals(transport).logger.transports) {
    if (item instanceof transports.Console) {
      item.silent = true
    }
  }

  return transport
}

function readLines(dir: string, file: string): string[] {
  return fs
    .readFileSync(path.join(dir, file), 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
}

function readRecord(dir: string, file: string): IStructuredRecord {
  return JSON.parse(readLines(dir, file)[0]) as IStructuredRecord
}

describe('TransportWinston', () => {
  test('should create the log directory when it does not exist', () => {
    const dir = path.join(logDir(), 'nested', 'deeper')
    build(dir)

    expect(fs.existsSync(dir)).toBe(true)
  })

  test('should keep the flattened line format by default', async () => {
    const dir = logDir()
    const transport = build(dir)

    transport.log('info', 'served a request')
    await flush()

    const [line] = readLines(dir, 'combined.log')

    // Downstream parses these files by shape. Turning the default output into JSON on a minor release
    // would break every one of those consumers, which is why the structured mode has to stay opt-in.
    expect(line).toMatch(/^\S+ info: served a request$/)
    expect(line.startsWith('{')).toBe(false)
  })

  test('should not build a record winston would discard', () => {
    const transport = build(logDir())
    const { logger } = internals(transport)

    logger.level = 'info'

    const seen: string[] = []
    logger.log = ((entry: { level: string }) => {
      seen.push(entry.level)

      return logger
    }) as unknown as typeof logger.log

    transport.log('debug', 'discarded before it costs anything')
    transport.log('info', 'kept')

    expect(seen).toEqual(['info'])
  })

  test('should not throw out of log() when winston fails', () => {
    const transport = build(logDir())
    const { logger } = internals(transport)

    logger.log = () => {
      throw new Error('winston is broken')
    }

    const reported: unknown[] = []
    const originalConsoleError = console.error
    console.error = (...args: unknown[]) => {
      reported.push(args)
    }

    try {
      expect(() => transport.log('error', 'boom')).not.toThrow()
    } finally {
      console.error = originalConsoleError
    }

    expect(reported).toHaveLength(1)
  })
})

describe('TransportWinston structured mode', () => {
  test('should write one JSON object per line', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    transport.log('info', 'served a request', { route: 'article:list', ms: 12 })
    await flush()

    const record = readRecord(dir, 'combined.log')

    expect(record.level).toEqual('info')
    expect(record.message).toEqual('served a request')
    expect(record.details).toEqual([{ route: 'article:list', ms: 12 }])
    expect(typeof record.timestamp).toEqual('string')
  })

  test('should unwrap an Error and its cause', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    transport.log('error', new Error('upstream refused', { cause: new Error('ECONNREFUSED') }))
    await flush()

    const record = readRecord(dir, 'error.log')

    expect(record.message).toEqual('upstream refused')
    expect(record.stack).toContain('Error: upstream refused')
    // `format.errors({ cause: true })` copies the cause over as the `Error` it is, and an `Error` has no
    // enumerable own properties — left alone it reaches the file as `{}`.
    expect(record.cause?.message).toEqual('ECONNREFUSED')
  })

  test('should keep an Error that follows the message out of the file as an empty object', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    // The dominant call shape in this codebase: a text prefix, some context, then the error.
    transport.log('error', 'save', { id: 7 }, new Error('mapping conflict'))
    await flush()

    const record = readRecord(dir, 'error.log')

    expect(record.message).toEqual('save')
    expect(record.details?.[0]).toEqual({ id: 7 })
    expect(record.details?.[1].message).toEqual('mapping conflict')
    expect(record.details?.[1].stack).toContain('Error: mapping conflict')
  })
})

describe('TransportWinston structured mode under hostile input', () => {
  test('should still write the line when the head Error has a throwing stack getter', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    const hostile = new Error('stack is unreadable')
    Object.defineProperty(hostile, 'stack', {
      get() {
        throw new Error('hostile getter')
      },
    })

    // Winston reads `stack` inside its own format chain, where the throw unwinds past `Logger.log()` and
    // the record is dropped: three submitted used to mean two written.
    transport.log('error', 'before')
    transport.log('error', hostile)
    transport.log('error', 'after')
    await flush()

    const written = readLines(dir, 'error.log')

    expect(written).toHaveLength(3)
    expect(JSON.stringify(written[1])).toContain('stack is unreadable')
  })

  test('should still write the line for values that cannot be serialised at all', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    const revocable = Proxy.revocable({}, {})
    revocable.revoke()

    const hostileToJSON = {
      toJSON(): never {
        throw new Error('toJSON is hostile')
      },
    }

    transport.log('error', revocable.proxy)
    transport.log('error', 'context', hostileToJSON, { big: BigInt(1) })
    await flush()

    const written = readLines(dir, 'error.log')

    expect(written).toHaveLength(2)
    expect(written[0]).toContain('[Unreadable]')
    expect(written[1]).toContain('[Unreadable]')
  })

  test('should bound a detail large enough to make winston write nothing at all', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    // Above the File transport's 5 MB `maxsize`, which winston answers by writing no bytes at all — not
    // this record, and not the healthy ones behind it.
    transport.log('error', 'giant', { blob: 'z'.repeat(6 * 1024 * 1024) })
    transport.log('error', 'after the giant')
    await flush()

    const written = readLines(dir, 'error.log')

    expect(written).toHaveLength(2)
    expect(written[0]).toContain('[truncated')
    expect(fs.statSync(path.join(dir, 'error.log')).size).toBeLessThan(1024 * 1024)
  })

  test('should not split a surrogate pair when it truncates', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    // The cut falls wherever the budget runs out, so the run is offset one character at a time: whichever
    // way the pairs line up against that boundary, one of these four lands between the halves of one.
    for (let offset = 0; offset < 4; offset += 1) {
      transport.log('error', 'emoji', { s: `${'x'.repeat(offset)}${'\u{1F600}'.repeat(40000)}` })
    }
    await flush()

    const written = readLines(dir, 'error.log')

    expect(written).toHaveLength(4)

    for (const line of written) {
      const [detail] = (JSON.parse(line) as { details: { s: string }[] }).details

      // The assertion has to be on the parsed value. `format.json()` re-escapes a lone surrogate as
      // `\ud83d` rather than emitting U+FFFD, so searching the line itself for U+FFFD can never fail —
      // delete the back-off in `clip` and a line-level assertion stays green on a corrupted record.
      expect(detail.s).toContain('[truncated')
      expect(isWellFormed(detail.s)).toBe(true)
    }
  })
})

describe('TransportWinston structured mode budget', () => {
  test('should measure a shared reference the way winston writes it', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    // No cycle anywhere: two hundred fields pointing at one object. A seen-anywhere check measures that
    // object once and calls every repeat twelve characters; the `safe-stable-stringify` inside
    // `format.json()` checks the holder path only and writes it out two hundred times. Measured as
    // fitting and handed over as it arrived, the record reached the File transport above `maxsize` —
    // which winston answers by writing no bytes at all, this record and the healthy one behind it gone,
    // and no error raised anywhere.
    const shared = { blob: 'z'.repeat(60000) }
    const payload = Object.fromEntries(Array.from({ length: 200 }, (_, index) => [`ref${index}`, shared]))

    transport.log('error', 'shared', payload)
    transport.log('error', 'healthy record behind the giant')
    await flush()

    const written = readLines(dir, 'error.log')

    expect(written).toHaveLength(2)
    expect(written[1]).toContain('healthy record behind the giant')
    expect(fs.statSync(path.join(dir, 'error.log')).size).toBeGreaterThan(0)
    expect(fs.statSync(path.join(dir, 'error.log')).size).toBeLessThan(1024 * 1024)
  })

  test('should measure a shared reference inside the head Error the same way', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    // The head `Error` is the one value still handed to winston as it arrived, because that is what
    // produces the flat `message`/`stack`/`cause` fields. Its own properties therefore have to be measured
    // the way winston will write them, or the record certified as fitting is the one that empties the file.
    // Sized so a seen-anywhere measurement lands comfortably inside the budget — the shared object counted
    // once, every repeat twelve characters — while the expansion winston writes is 10 MB.
    const shared = { blob: 'z'.repeat(50000) }
    const refs = Object.fromEntries(Array.from({ length: 200 }, (_, index) => [`ref${index}`, shared]))
    const hostile = Object.assign(new Error('carries a shared reference'), refs)

    transport.log('error', hostile)
    transport.log('error', 'healthy record behind the giant')
    await flush()

    const written = readLines(dir, 'error.log')

    expect(written).toHaveLength(2)
    expect(written[0]).toContain('carries a shared reference')
    expect(written[1]).toContain('healthy record behind the giant')
    expect(fs.statSync(path.join(dir, 'error.log')).size).toBeLessThan(1024 * 1024)
  })

  test('should leave a shared reference alone while its expansion still fits', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    const shared = { blob: 'z'.repeat(1000) }
    const payload = Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`ref${index}`, shared]))

    transport.log('info', 'shared', payload)
    await flush()

    // Measuring the expansion rather than the object graph must not turn into clipping records that fit.
    const detail = readRecord(dir, 'combined.log').details?.[0] as Record<string, { blob: string }>

    expect(Object.keys(detail)).toHaveLength(10)
    expect(detail.ref9.blob).toHaveLength(1000)
  })

  test('should collapse the details it cannot afford into a single marker', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    const details = Array.from({ length: 60000 }, (_, index) => ({ index }))

    transport.log('error', 'many', ...details)
    await flush()

    const [line] = readLines(dir, 'error.log')
    const record = JSON.parse(line) as { details: string[] }

    // Past the budget every remaining detail still emitted a marker of its own: sixty thousand of them
    // built a 1.3 MB record against a 64 KB budget.
    expect(line.length).toBeLessThan(70000)
    expect(record.details[record.details.length - 1]).toMatch(/^\.\.\.\[truncated \d+ details]$/)
  })
})

describe('TransportWinston structured mode fidelity', () => {
  test('should keep a self-referential context readable instead of losing it whole', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    const context: Record<string, unknown> = { requestId: 'r-1', user: { id: 9 } }
    context.self = context

    transport.log('error', 'ctx', context)
    await flush()

    // `JSON.stringify` throws on a cycle where winston's serialiser writes `[Circular]`. Measuring with a
    // plain `JSON.stringify` degrades this whole detail to `[Unreadable]`, request id and user with it.
    expect(readRecord(dir, 'error.log').details?.[0]).toEqual({ requestId: 'r-1', self: '[Circular]', user: { id: 9 } })
  })

  test('should unwrap an Error nested inside a plain detail object', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    transport.log('error', 'ctx', { err: new Error('nested boom') })
    await flush()

    // An `Error` has no enumerable own properties, so left alone this reaches the file as `{"err":{}}`.
    const detail = readRecord(dir, 'error.log').details?.[0] as { err: IStructuredDetail }

    expect(detail.err.message).toEqual('nested boom')
    expect(detail.err.stack).toContain('Error: nested boom')
  })

  test('should mark a cause chain it stopped following rather than drop it', async () => {
    const dir = logDir()
    const transport = build(dir, { structured: true })

    const deepest = new Error('l5')
    const chain = new Error('l1', { cause: new Error('l2', { cause: new Error('l3', { cause: new Error('l4', { cause: deepest }) }) }) })

    transport.log('error', 'ctx', chain)
    await flush()

    const detail = readRecord(dir, 'error.log').details?.[0] as { cause: { cause: { cause: { message: string; cause: unknown } } } }

    // Dropped as `undefined` there is no way to tell a cause that was not followed from an error with none.
    expect(detail.cause.cause.cause.message).toEqual('l4')
    expect(detail.cause.cause.cause.cause).toEqual('[Cause chain truncated]')
  })
})
