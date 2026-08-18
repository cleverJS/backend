import fs from 'fs'
import os from 'os'
import path from 'path'
import { transports } from 'winston'

import { argsStringify } from '../../core/logger/argsStringify'
import { TransportTelegram } from '../../core/logger/transport/TransportTelegram'
import { TransportWinston } from '../../core/logger/transport/TransportWinston'
import { ITransportWinstonRotateConfig, TransportWinstonRotate } from '../../core/logger/transport/TransportWinstonRotate'
import { TelegramMessenger } from '../../core/utils/telegram'

/** winston writes through a stream; give it a tick to reach the filesystem. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 250))
}

/** Which serialiser a transport ended up with is not observable from the outside any other way. */
interface IStringifyHolder {
  stringify: (...args: unknown[]) => string
}

function stringifierOf(transport: object): (...args: unknown[]) => string {
  return (transport as unknown as IStringifyHolder).stringify
}

/** The options a `DailyRotateFile` was constructed with, which is where a leaked config field would show up. */
interface IRotateInternals {
  logger: { transports: { options?: Record<string, unknown> }[] }
}

function rotateOptionsOf(transport: TransportWinstonRotate): Record<string, unknown>[] {
  return (transport as unknown as IRotateInternals).logger.transports.map((item) => item.options ?? {})
}

const dirs: string[] = []

// A rotate transport opens its files after construction returns, so a directory pulled out from
// under one that was built but never written to reaches winston as an uncaught ENOENT.
afterAll(async () => {
  await flush()

  for (const dir of dirs) {
    fs.rmSync(dir, { recursive: true, force: true })
  }
})

function logDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'transport-limits-'))
  dirs.push(dir)

  return dir
}

function buildWinston(dir: string, config: ConstructorParameters<typeof TransportWinston>[1] = {}): TransportWinston {
  const transport = new TransportWinston(dir, config)

  for (const item of (transport as unknown as { logger: { transports: unknown[] } }).logger.transports) {
    if (item instanceof transports.Console) {
      item.silent = true
    }
  }

  return transport
}

/** Each logger that handles process events adds a listener to the one process the suite shares. */
function buildRotate(dir: string, config: ITransportWinstonRotateConfig = {}): TransportWinstonRotate {
  return new TransportWinstonRotate(dir, { console: false, handleProcessEvents: false, ...config })
}

function fakeMessenger(sent: string[]): TelegramMessenger {
  return {
    send: (message: string): Promise<void> => {
      sent.push(message)

      return Promise.resolve()
    },
  } as unknown as TelegramMessenger
}

function readLines(dir: string, file: string): string[] {
  return fs
    .readFileSync(path.join(dir, file), 'utf8')
    .split('\n')
    .filter((line) => line.length > 0)
}

function rotateFile(dir: string, prefix: string): string {
  return fs.readdirSync(dir).find((name) => name.startsWith(prefix)) as string
}

const HEAD = 'served'
const LONG = 'x'.repeat(5000)
const EXPECTED_DEFAULT = argsStringify(HEAD, LONG)
/** The argument sink spends `argChars` on content plus the marker it appends when it overflows. */
const EXPECTED_TIGHT = `${HEAD} ${'x'.repeat(189)}[truncated]`
const TELEGRAM_MESSAGE_CHARS = 4096
/** Telegram's default budget, minus what `HEAD`, the separator and the overflow marker already spend. */
const EXPECTED_TELEGRAM = `${HEAD} ${'x'.repeat(3999)}[truncated]`

describe('transport serialiser limits', () => {
  test('should share the process-wide serialiser when no limits are supplied', () => {
    // Not merely equivalent behaviour: the same function object, so a default transport cannot drift
    // from `argsStringify` and costs nothing to construct.
    expect(stringifierOf(buildWinston(logDir()))).toBe(argsStringify)
    expect(stringifierOf(buildRotate(logDir()))).toBe(argsStringify)
  })

  test('should give TransportTelegram a serialiser of its own even with no limits supplied', () => {
    // It cannot share: its default has to hold one log line inside a single 4096-character Bot API
    // message, which is far below the process-wide bounds a file transport wants.
    expect(stringifierOf(new TransportTelegram(fakeMessenger([])))).not.toBe(argsStringify)
  })

  test('should build a private serialiser only when limits are supplied', () => {
    expect(stringifierOf(buildWinston(logDir(), { limits: { argChars: 200 } }))).not.toBe(argsStringify)
    expect(stringifierOf(buildRotate(logDir(), { limits: { argChars: 200 } }))).not.toBe(argsStringify)
    expect(stringifierOf(new TransportTelegram(fakeMessenger([]), { limits: { argChars: 200 } }))).not.toBe(argsStringify)
  })

  test('should keep the default limits far above the payload used here', () => {
    // Without this the truncation assertions below would pass against a default that already truncates.
    expect(EXPECTED_DEFAULT).toHaveLength(5007)
    expect(EXPECTED_DEFAULT).not.toContain('[truncated]')
    expect(EXPECTED_TIGHT).toHaveLength(207)
  })
})

describe('TransportWinston serialiser limits', () => {
  test('should write exactly what the shared serialiser produces by default', async () => {
    const dir = logDir()
    buildWinston(dir).log('info', HEAD, LONG)
    await flush()

    const [line] = readLines(dir, 'combined.log')

    expect(line.endsWith(` info: ${EXPECTED_DEFAULT}`)).toBe(true)
  })

  test('should truncate at the supplied argChars', async () => {
    const dir = logDir()
    buildWinston(dir, { limits: { argChars: 200 } }).log('info', HEAD, LONG)
    await flush()

    const [line] = readLines(dir, 'combined.log')

    expect(line.endsWith(` info: ${EXPECTED_TIGHT}`)).toBe(true)
  })

  test('should ignore a field explicitly set to undefined', async () => {
    const dir = logDir()
    buildWinston(dir, { limits: { argChars: undefined } }).log('info', HEAD, LONG)
    await flush()

    const [line] = readLines(dir, 'combined.log')

    expect(line.endsWith(` info: ${EXPECTED_DEFAULT}`)).toBe(true)
  })

  test('should leave structured mode alone, which does not go through that serialiser', async () => {
    const dir = logDir()
    buildWinston(dir, { structured: true, limits: { argChars: 200 } }).log('info', HEAD, LONG)
    await flush()

    const record = JSON.parse(readLines(dir, 'combined.log')[0]) as { message: string; details: string[] }

    expect(record.message).toEqual(HEAD)
    expect(record.details[0]).toEqual(LONG)
  })
})

describe('TransportWinstonRotate serialiser limits', () => {
  test('should write exactly what the shared serialiser produces by default', async () => {
    const dir = logDir()
    buildRotate(dir).log('info', HEAD, LONG)
    await flush()

    const [line] = readLines(dir, rotateFile(dir, 'app-info-'))

    expect(line.endsWith(`[info][app] ${EXPECTED_DEFAULT}`)).toBe(true)
  })

  test('should truncate at the supplied argChars', async () => {
    const dir = logDir()
    buildRotate(dir, { limits: { argChars: 200 } }).log('info', HEAD, LONG)
    await flush()

    const [line] = readLines(dir, rotateFile(dir, 'app-info-'))

    expect(line.endsWith(`[info][app] ${EXPECTED_TIGHT}`)).toBe(true)
  })

  test('should ignore a field explicitly set to undefined', async () => {
    const dir = logDir()
    buildRotate(dir, { limits: { argChars: undefined } }).log('info', HEAD, LONG)
    await flush()

    const [line] = readLines(dir, rotateFile(dir, 'app-info-'))

    expect(line.endsWith(`[info][app] ${EXPECTED_DEFAULT}`)).toBe(true)
  })

  test('should not hand the option to DailyRotateFile', () => {
    const options = rotateOptionsOf(buildRotate(logDir(), { limits: { argChars: 200 } }))

    expect(options).toHaveLength(2)
    for (const item of options) {
      // Whatever is left in the config after our own fields are destructured out is forwarded verbatim,
      // so an option this transport owns has to be named there or it reaches the rotation library.
      expect(Object.keys(item)).not.toContain('limits')
      // The rotation policy still arrives, so the assertion above is not passing on an empty object.
      expect(item.maxSize).toEqual('20m')
    }
  })
})

describe('TransportTelegram serialiser limits', () => {
  test('should cut the default down to one Bot API message', () => {
    const sent: string[] = []
    new TransportTelegram(fakeMessenger(sent)).log('error', HEAD, LONG)

    expect(sent).toHaveLength(1)
    // Unlike the file transports above, which keep all 5007 characters.
    expect(sent[0].endsWith(` [error] ${EXPECTED_TELEGRAM}`)).toBe(true)
    expect(sent[0].length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_CHARS)
  })

  test('should truncate at the supplied argChars', () => {
    const sent: string[] = []
    new TransportTelegram(fakeMessenger(sent), { limits: { argChars: 200 } }).log('error', HEAD, LONG)

    expect(sent).toHaveLength(1)
    expect(sent[0].endsWith(` [error] ${EXPECTED_TIGHT}`)).toBe(true)
  })

  test('should ignore a field explicitly set to undefined', () => {
    // `exactOptionalPropertyTypes` is off, so `{ totalChars: raw ? Number(raw) : undefined }` — a
    // config read from the environment — type-checks. Spread unguarded, that `undefined` replaced the
    // default, the sink's capacity arithmetic became NaN and every argument rendered as nothing: the
    // alert arrived as bare `2026-08-16T08:24:56.712Z [error] `, which is worse than no alert.
    const sent: string[] = []
    new TransportTelegram(fakeMessenger(sent), { limits: { totalChars: undefined } }).log('error', HEAD, LONG)

    expect(sent).toHaveLength(1)
    expect(sent[0].endsWith(` [error] ${EXPECTED_TELEGRAM}`)).toBe(true)
  })

  test('should keep the one-argument call form working', () => {
    const sent: string[] = []
    const transport = new TransportTelegram(fakeMessenger(sent))

    transport.log('warn', 'disk is filling up')
    transport.log('info', 'ignored')

    expect(sent).toHaveLength(1)
    expect(sent[0]).toContain('[warn] disk is filling up')
  })
})
