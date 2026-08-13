import fs from 'fs'
import os from 'os'
import path from 'path'

import { ITransportWinstonRotateConfig, TransportWinstonRotate } from '../../core/logger/transport/TransportWinstonRotate'

const TRANSPORT_SOURCE = path.resolve(`${__dirname}/../../core/logger/transport/TransportWinstonRotate.ts`)

/** winston writes through a stream; give it a tick to reach the filesystem. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 250))
}

function makeLogDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'transport-rotate-'))
}

/**
 * The rotation policy is not observable from outside winston without waiting for a real
 * rollover, so these assertions read the options off the transports the logger holds.
 */
interface IWinstonInternals {
  logger: {
    transports: {
      handleExceptions?: boolean
      options?: {
        maxSize?: string | number
        maxFiles?: string | number
        zippedArchive?: boolean
        utc?: boolean
      }
    }[]
  }
}

function transportsOf(transport: TransportWinstonRotate): IWinstonInternals['logger']['transports'] {
  return (transport as unknown as IWinstonInternals).logger.transports
}

function readLogFiles(dir: string): string[] {
  return fs
    .readdirSync(dir)
    .filter((name) => name.endsWith('.log'))
    .sort()
}

describe('TransportWinstonRotate', () => {
  const dirs: string[] = []

  afterAll(() => {
    for (const dir of dirs) {
      fs.rmSync(dir, { recursive: true, force: true })
    }
  })

  function logDir(): string {
    const dir = makeLogDir()
    dirs.push(dir)
    return dir
  }

  /**
   * Every logger built here shares one process, and each one that handles process events adds a
   * listener to it — the exact effect `handleProcessEvents` exists to control. Default it off so a
   * suite of ten does not drown the run in MaxListeners warnings.
   */
  function build(dir: string, config: ITransportWinstonRotateConfig = {}): TransportWinstonRotate {
    return new TransportWinstonRotate(dir, { console: false, handleProcessEvents: false, ...config })
  }

  test('should create the log directory when it does not exist', () => {
    const dir = path.join(logDir(), 'nested', 'deeper')
    build(dir)

    expect(fs.existsSync(dir)).toBe(true)
  })

  test('should name files <namespace>-<level>-<date>.log with the date resolved', async () => {
    const dir = logDir()
    const transport = build(dir, { namespace: 'billing' })

    transport.log('error', 'boom')
    await flush()

    const files = readLogFiles(dir)
    // The date has to be substituted for %DATE% — an unresolved pattern token or a
    // datePattern winston cannot parse both produce a single ever-growing file.
    expect(files).toContainEqual(expect.stringMatching(/^billing-error-\d{4}-\d{2}-\d{2}\.log$/))
    expect(files.some((name) => name.includes('%DATE%'))).toBe(false)
  })

  test('should write errors to both files and non-errors only to the info file', async () => {
    const dir = logDir()
    const transport = build(dir, { namespace: 'app' })

    transport.log('error', 'failed to reach upstream')
    transport.log('info', 'served a request')
    await flush()

    const files = readLogFiles(dir)
    const errorFile = files.find((name) => name.startsWith('app-error-'))
    const infoFile = files.find((name) => name.startsWith('app-info-'))

    expect(errorFile).toBeDefined()
    expect(infoFile).toBeDefined()

    const errorContent = fs.readFileSync(path.join(dir, errorFile as string), 'utf8')
    const infoContent = fs.readFileSync(path.join(dir, infoFile as string), 'utf8')

    expect(errorContent).toContain('failed to reach upstream')
    expect(errorContent).not.toContain('served a request')

    // `info` is the combined file: it carries the error too.
    expect(infoContent).toContain('served a request')
    expect(infoContent).toContain('failed to reach upstream')
  })

  test('should tag every line with the level and the namespace', async () => {
    const dir = logDir()
    const transport = build(dir, { namespace: 'scheduler' })

    transport.log('error', 'nightly sync failed')
    await flush()

    const file = readLogFiles(dir).find((name) => name.startsWith('scheduler-error-')) as string
    const content = fs.readFileSync(path.join(dir, file), 'utf8')

    expect(content).toMatch(/\[error]\[scheduler] nightly sync failed/)
  })

  test('should carry the rotation policy onto both file transports', () => {
    const dir = logDir()
    const transport = build(dir, { maxSize: '5m', maxFiles: '7d', zippedArchive: false })

    const options = transportsOf(transport).map((item) => item.options)

    expect(options).toHaveLength(2)
    for (const item of options) {
      expect(item?.maxSize).toEqual('5m')
      expect(item?.maxFiles).toEqual('7d')
      expect(item?.zippedArchive).toBe(false)
    }
  })

  test('should apply the documented defaults', () => {
    const dir = logDir()
    const transport = build(dir)

    const [options] = transportsOf(transport).map((item) => item.options)

    expect(options?.maxSize).toEqual('20m')
    expect(options?.maxFiles).toEqual('30d')
    expect(options?.zippedArchive).toBe(true)
    expect(options?.utc).toBe(true)
  })

  test('should add the console transport unless it is turned off', () => {
    const dir = logDir()

    expect(transportsOf(build(dir, { console: true }))).toHaveLength(3)
    expect(transportsOf(build(dir))).toHaveLength(2)
  })

  test('should hook process events only when asked', () => {
    const dir = logDir()

    const on = transportsOf(build(dir, { handleProcessEvents: true }))
    const off = transportsOf(build(dir))

    // Winston registers one process listener per logger, so a service building several
    // namespaced loggers has to be able to turn this off on all but one of them.
    expect(on.every((item) => item.handleExceptions)).toBe(true)
    expect(off.some((item) => item.handleExceptions)).toBe(false)
  })

  test('should explain itself when the optional peer dependency is missing', () => {
    class WithoutPeer extends TransportWinstonRotate {
      protected resolveDailyRotateFile(): never {
        throw new Error("Cannot find module 'winston-daily-rotate-file'")
      }
    }

    expect(() => new WithoutPeer(logDir(), { console: false })).toThrow(/winston-daily-rotate-file/)
  })

  test('should not import the optional peer dependency at module scope', () => {
    // This file is re-exported from the package root, which every consumer loads eagerly.
    // A value import here would turn an optional peer dependency into a mandatory one and
    // break every service that upgrades without installing it.
    const imports = fs
      .readFileSync(TRANSPORT_SOURCE, 'utf8')
      .split('\n')
      .filter((line) => line.startsWith('import ') && line.includes("'winston-daily-rotate-file'"))

    expect(imports).toHaveLength(1)
    expect(imports[0].startsWith('import type ')).toBe(true)
  })
})
