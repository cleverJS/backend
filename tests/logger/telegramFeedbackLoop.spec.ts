import { logger, loggerNamespace } from '../../core/logger/logger'
import { TransportTelegram } from '../../core/logger/transport/TransportTelegram'
import { TelegramMessenger, TOutOfBandErrorReporter } from '../../core/utils/telegram'

/** `bot` is protected, and the stub has to sit under `send` rather than replace it. */
interface IBotHolder {
  bot: {
    launch: () => Promise<void>
    telegram: { sendMessage: (channelID: string, text: string) => Promise<unknown> }
  }
}

interface ITransportRegistry {
  transports: Map<string, unknown>
}

const TELEGRAM_MESSAGE_CHARS = 4096
const CHANNEL = 'chan'
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

/** `String.prototype.isWellFormed` is newer than the ES2022 lib this project compiles against. */
function isWellFormed(text: string): boolean {
  return !LONE_SURROGATE.test(text)
}

const THROTTLED = '429 Too Many Requests'
const REPORTER_BROKEN = 'reporter broken'
const WEBHOOK_DOWN = 'slack webhook down'

function throwingReporter(received: unknown[]): TOutOfBandErrorReporter {
  return (...args: unknown[]): void => {
    received.push(...args)

    throw new Error(REPORTER_BROKEN)
  }
}

/**
 * Note the absence of a cast: an `async` function is assignable to a `void`-returning type, so this
 * is what an out-of-band reporter looks like the moment reporting means an HTTP call.
 */
function asyncRejectingReporter(received: unknown[]): TOutOfBandErrorReporter {
  // Disabled rather than avoided: this exact mismatch is what is under test, and a consumer whose
  // lint setup lacks the rule — the compiler never objects — ships it into `reportError`.
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  return async (...args: unknown[]): Promise<void> => {
    received.push(...args)

    await Promise.reject(new Error(WEBHOOK_DOWN))
  }
}

interface IStub {
  messenger: TelegramMessenger
  sent: string[]
  reported: unknown[]
}

function accepted(): Promise<unknown> {
  return Promise.resolve({})
}

function rejected(): Promise<unknown> {
  return Promise.reject(new Error(THROTTLED))
}

function throttledFor(failures: number): (calls: number) => Promise<unknown> {
  return (calls: number): Promise<unknown> => (calls <= failures ? rejected() : accepted())
}

/** Replaces the Bot API call underneath `send`; chunking and the reporter above it stay real. */
function installStub(messenger: TelegramMessenger, reply: (calls: number) => Promise<unknown>): string[] {
  const sent: string[] = []
  const holder = messenger as unknown as IBotHolder

  holder.bot.telegram.sendMessage = (channelID: string, text: string): Promise<unknown> => {
    sent.push(text)

    return reply(sent.length)
  }

  return sent
}

/**
 * A messenger whose Bot API call is replaced by `reply`. Everything above it — chunking, the
 * transport, the logger fan-out — is the real code.
 */
function stubMessenger(reply: (calls: number) => Promise<unknown>, reportError?: TOutOfBandErrorReporter): IStub {
  const reported: unknown[] = []
  const messenger = new TelegramMessenger('123:abc', CHANNEL, {
    reportError:
      reportError ??
      ((...args: unknown[]): void => {
        reported.push(...args)
      }),
  })

  return { messenger, sent: installStub(messenger, reply), reported }
}

/**
 * The loop ran through `.catch` handlers, so it advanced on microtasks only and never yielded to the
 * event loop. Draining a large number of them is what let an unbounded run be observed at all.
 */
async function drainMicrotasks(): Promise<void> {
  for (let i = 0; i < 50000; i++) {
    await Promise.resolve()
  }
}

let registered = 0

/** The transport has to be on the shared `logger`, because that global is what closed the cycle. */
async function throughGlobalLogger(transport: TransportTelegram, run: () => Promise<void>): Promise<void> {
  const code = `telegram-loop-${registered++}`
  logger.addTransport(transport, code)

  try {
    await run()
    await drainMicrotasks()
  } finally {
    ;(logger as unknown as ITransportRegistry).transports.delete(code)
  }
}

/** Node marks a rejection unhandled only after the turn that created it ends, hence the two hops. */
async function unhandledDuring(run: () => Promise<void>): Promise<unknown[]> {
  const captured: unknown[] = []
  const onUnhandled = (reason: unknown): void => {
    captured.push(reason)
  }

  process.on('unhandledRejection', onUnhandled)
  try {
    await run()
    await new Promise<void>((resolve) => setImmediate(resolve))
    await new Promise<void>((resolve) => setImmediate(resolve))
  } finally {
    process.off('unhandledRejection', onUnhandled)
  }

  return captured
}

describe('TelegramMessenger.send contract', () => {
  test('should resolve as before when the Bot API answers', async () => {
    const { messenger, sent } = stubMessenger(accepted)

    await expect(messenger.send('all good')).resolves.toBeUndefined()
    expect(sent).toEqual(['all good'])
  })

  test('should never reject, whatever the Bot API does', async () => {
    // Callers have always been free to omit `.catch`. A rejecting `send` would turn every one of
    // them into an unhandled rejection, which by default takes the process down.
    const cases: Record<string, (calls: number) => Promise<unknown>> = {
      'every chunk fails': rejected,
      'the first chunk fails': (calls: number) => (calls === 1 ? rejected() : accepted()),
      'a middle chunk fails': (calls: number) => (calls === 2 ? rejected() : accepted()),
      'the last chunk fails': (calls: number) => (calls === 3 ? rejected() : accepted()),
    }

    for (const reply of Object.values(cases)) {
      const { messenger } = stubMessenger(reply)

      await expect(messenger.send('x'.repeat(TELEGRAM_MESSAGE_CHARS * 3))).resolves.toBeUndefined()
      await expect(messenger.send('short')).resolves.toBeUndefined()
    }
  })

  test('should leave no promise without a handler when one chunk of many fails', async () => {
    const { messenger, sent, reported } = stubMessenger((calls: number) => (calls === 4 ? rejected() : accepted()))

    const captured = await unhandledDuring(async () => {
      await expect(messenger.send('x'.repeat(TELEGRAM_MESSAGE_CHARS * 10))).resolves.toBeUndefined()
    })

    expect(captured).toEqual([])
    // Every chunk is still attempted, and the one failure is reported rather than dropped.
    expect(sent).toHaveLength(10)
    expect(reported).toHaveLength(1)
  })

  test('should report the failure out of band rather than swallow it silently', async () => {
    const { messenger, reported } = stubMessenger(rejected)

    await messenger.send('boom')

    expect(reported).toHaveLength(1)
    expect(reported[0]).toBeInstanceOf(Error)
    expect((reported[0] as Error).message).toBe(THROTTLED)
  })

  test('should keep both existing constructor call forms working', async () => {
    const withDefaultChannel = new TelegramMessenger('123:abc', CHANNEL)
    const defaultChannelSent = installStub(withDefaultChannel, accepted)

    await expect(withDefaultChannel.send('implicit')).resolves.toBeUndefined()
    expect(defaultChannelSent).toEqual(['implicit'])

    const tokenOnly = new TelegramMessenger('123:abc')
    const tokenOnlySent = installStub(tokenOnly, accepted)

    // Without a default channel and without an explicit one there is nothing to send to; unchanged.
    await expect(tokenOnly.send('dropped')).resolves.toBeUndefined()
    expect(tokenOnlySent).toEqual([])

    await expect(tokenOnly.send('explicit', CHANNEL)).resolves.toBeUndefined()
    expect(tokenOnlySent).toEqual(['explicit'])
  })

  test('should default to console.error, which cannot reach Telegram', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    try {
      const messenger = new TelegramMessenger('123:abc', CHANNEL)
      const sent = installStub(messenger, rejected)

      await throughGlobalLogger(new TransportTelegram(messenger), async () => {
        await expect(messenger.send('boom')).resolves.toBeUndefined()
      })

      expect(sent).toHaveLength(1)
      expect(spy).toHaveBeenCalledTimes(1)
    } finally {
      spy.mockRestore()
    }
  })
})

describe('TelegramMessenger reporter failures', () => {
  // The reporter is injected, so its failure modes ship with the feature rather than against it.
  // Every one of these went through `.catch(this.reportError)` and came back out of `send`.
  test('should resolve when the reporter throws synchronously', async () => {
    const received: unknown[] = []
    const { messenger, sent } = stubMessenger(rejected, throwingReporter(received))

    const captured = await unhandledDuring(async () => {
      await expect(messenger.send('boom')).resolves.toBeUndefined()
    })

    expect(captured).toEqual([])
    expect(sent).toHaveLength(1)
    // Guarding the reporter must not stop it being called: the delivery failure still reaches it.
    expect(received).toHaveLength(1)
  })

  test('should resolve when an async reporter rejects', async () => {
    const received: unknown[] = []
    const { messenger } = stubMessenger(rejected, asyncRejectingReporter(received))

    const captured = await unhandledDuring(async () => {
      await expect(messenger.send('boom')).resolves.toBeUndefined()
    })

    expect(captured).toEqual([])
    expect(received).toHaveLength(1)
  })

  test('should resolve on a chunked send when every chunk hits the broken reporter', async () => {
    const received: unknown[] = []
    const { messenger, sent } = stubMessenger(rejected, throwingReporter(received))

    const captured = await unhandledDuring(async () => {
      await expect(messenger.send('x'.repeat(TELEGRAM_MESSAGE_CHARS * 3))).resolves.toBeUndefined()
    })

    // `Promise.all` propagates the first rejection, so one broken report used to take the whole send
    // with it while the remaining chunks were already in flight.
    expect(captured).toEqual([])
    expect(sent).toHaveLength(3)
    expect(received).toHaveLength(3)
  })

  test('should leave no unhandled rejection when a failed launch meets a broken reporter', async () => {
    const received: unknown[] = []
    const { messenger } = stubMessenger(accepted, throwingReporter(received))
    const holder = messenger as unknown as IBotHolder
    holder.bot.launch = (): Promise<void> => Promise.reject(new Error('bad token'))

    const captured = await unhandledDuring(() => {
      expect(messenger.start()).toBe(true)

      return Promise.resolve()
    })

    // `start` returns a boolean and nothing follows the handler on `launch`, so a rejection escaping
    // here is one no caller can attach a handler to — by default it takes the process down.
    expect(captured).toEqual([])
    expect(received).toHaveLength(1)
  })
})

describe('TelegramMessenger failure reporting', () => {
  test('should not route its own failure back through the logger', async () => {
    const { messenger, sent } = stubMessenger(rejected)

    await throughGlobalLogger(new TransportTelegram(messenger), async () => {
      await expect(messenger.send('boom')).resolves.toBeUndefined()
    })

    // Before the fix a permanently failing Bot API produced sends without end: the reported failure
    // reached `logger.error`, which fanned out to this very transport.
    expect(sent).toHaveLength(1)
  })

  test('should stay at one send however long the failure lasts', async () => {
    for (const failures of [40, 200, 500]) {
      const { messenger, sent } = stubMessenger(throttledFor(failures))

      await throughGlobalLogger(new TransportTelegram(messenger), async () => {
        await expect(messenger.send('boom')).resolves.toBeUndefined()
      })

      expect(sent).toHaveLength(1)
    }
  })

  test('should loop again if the application logger is wired in as the reporter', async () => {
    // This is the bug, reproduced through the injection point: the reporter is the one thing that
    // must not lead back to `TransportTelegram`, and here it does. Exactly one retry per failure,
    // the run stopping only once Telegram starts answering — 41, 201 and 501 sends.
    const appLogger = loggerNamespace('TelegramMessenger')

    for (const failures of [40, 200, 500]) {
      const { messenger, sent } = stubMessenger(throttledFor(failures), appLogger.error)

      await throughGlobalLogger(new TransportTelegram(messenger), async () => {
        await messenger.send('boom')
      })

      expect(sent).toHaveLength(failures + 1)
    }
  })

  test('should keep a failed launch off Telegram entirely', async () => {
    const { messenger, sent, reported } = stubMessenger(accepted)
    const holder = messenger as unknown as IBotHolder
    holder.bot.launch = (): Promise<void> => Promise.reject(new Error('bad token'))

    await throughGlobalLogger(new TransportTelegram(messenger), () => {
      expect(messenger.start()).toBe(true)

      return Promise.resolve()
    })

    // `launch` failing used to hop into the logger and cost one send; the reporter ends it before
    // Telegram is involved at all. `start`'s 'Telegram bot starting' is `info`, which the transport
    // does not forward, so it adds nothing either.
    expect(sent).toHaveLength(0)
    expect(reported).toHaveLength(1)
  })

  test('should still deliver application errors to Telegram', async () => {
    const { messenger, sent } = stubMessenger(accepted)

    await throughGlobalLogger(new TransportTelegram(messenger), () => {
      logger.error('database unreachable')

      return Promise.resolve()
    })

    expect(sent).toHaveLength(1)
    expect(sent[0]).toContain('database unreachable')
  })
})

describe('TransportTelegram message budget', () => {
  function logThrough(transport: TransportTelegram, sent: string[], ...args: unknown[]): void {
    transport.log('error', ...args)
    expect(sent.length).toBeGreaterThan(0)
  }

  test('should keep one log line to one Telegram message', () => {
    const { messenger, sent } = stubMessenger(accepted)
    const transport = new TransportTelegram(messenger)

    logThrough(transport, sent, 'request failed', 'x'.repeat(10_000_000))

    expect(sent).toHaveLength(1)
    expect(sent[0].length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_CHARS)
  })

  test('should fit the composed message inside the cap for every shape that can fill the budget', () => {
    const payloads: Record<string, unknown[]> = {
      'one huge string': ['x'.repeat(10_000_000)],
      'many huge strings': Array.from({ length: 20 }, () => 'y'.repeat(500_000)),
      'huge error': [new Error('e'.repeat(1_000_000))],
      'nested object beside a string': [{ a: { b: { c: 'z'.repeat(999_999) } } }, 'q'.repeat(999_999)],
      'astral tail': [`${'a'.repeat(4_000_000)}${'\u{1F600}'.repeat(100)}`],
    }

    for (const args of Object.values(payloads)) {
      const { messenger, sent } = stubMessenger(accepted)
      logThrough(new TransportTelegram(messenger), sent, ...args)

      // One send is the whole point; the length assertion is what makes that hold for any payload,
      // since `TelegramMessenger.send` splits at exactly this width.
      expect(sent).toHaveLength(1)
      expect(sent[0].length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_CHARS)
      expect(isWellFormed(sent[0])).toBe(true)
    }
  })

  test('should keep one message when the clock sits outside the four-digit year range', () => {
    // `Date#toISOString` switches to an expanded year — `+010000-01-01T00:00:00.000Z`, three
    // characters wider — and against a prefix allowance written down as 33 that composed 4099
    // characters, which `send` then split into two messages with no sign that it had.
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('+010000-01-01T00:00:00.000Z'))

    try {
      const { messenger, sent } = stubMessenger(accepted)
      logThrough(new TransportTelegram(messenger), sent, 'x'.repeat(10_000_000))

      expect(sent[0].startsWith('+010000-01-01T00:00:00.000Z [error] ')).toBe(true)
      expect(sent).toHaveLength(1)
      expect(sent[0].length).toBeLessThanOrEqual(TELEGRAM_MESSAGE_CHARS)
    } finally {
      vi.useRealTimers()
    }
  })

  test('should split exactly where the chosen budget assumes it does', async () => {
    // Why the default is 4096 minus the widest `<iso> [error] ` prefix and not less: a composed
    // message of exactly 4096 is still a single send, and one more character is not.
    for (const [width, expected] of [
      [TELEGRAM_MESSAGE_CHARS - 1, 1],
      [TELEGRAM_MESSAGE_CHARS, 1],
      [TELEGRAM_MESSAGE_CHARS + 1, 2],
    ]) {
      const { messenger, sent } = stubMessenger(accepted)
      await messenger.send('x'.repeat(width))

      expect(sent).toHaveLength(expected)
    }
  })

  test('should sit at the boundary rather than far below it', () => {
    const { messenger, sent } = stubMessenger(accepted)
    logThrough(new TransportTelegram(messenger), sent, ...Array.from({ length: 20 }, () => 'y'.repeat(500_000)))

    // Guards the other direction: a default so tight that alerts arrive gutted would pass every
    // assertion above.
    expect(sent[0].length).toBeGreaterThan(TELEGRAM_MESSAGE_CHARS - 64)
  })

  test('should let an explicit limits override win over the default', () => {
    const { messenger, sent } = stubMessenger(accepted)
    const transport = new TransportTelegram(messenger, {
      limits: { totalChars: 262144, argChars: 262144, stringChars: 262144 },
    })

    logThrough(transport, sent, 'x'.repeat(10_000_000))

    // 262144 is the process-wide `totalChars` this transport used to inherit, and 64 sends per log
    // line is what that cost.
    expect(sent).toHaveLength(64)
  })

  test('should apply the default to fields an override leaves alone', () => {
    const { messenger, sent } = stubMessenger(accepted)
    logThrough(new TransportTelegram(messenger, { limits: { objectDepth: 3 } }), sent, 'x'.repeat(10_000_000))

    expect(sent).toHaveLength(1)
  })
})
