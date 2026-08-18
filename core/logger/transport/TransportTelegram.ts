import { TelegramMessenger } from '../../utils/telegram'
import { createArgsStringify, IArgsStringifyLimits } from '../argsStringify'

import { definedLimits } from './limits'
import { LogLevel, TransportInterface } from './TransportInterface'

const TELEGRAM_MESSAGE_CHARS = 4096
/** The only levels this transport forwards, and therefore the only ones the prefix bound has to cover. */
const FORWARDED_LEVELS: readonly LogLevel[] = ['error', 'warn']
/**
 * `+275760-09-13T00:00:00.000Z` — the widest timestamp `Date#toISOString` can return. Years outside
 * 0–9999 print in expanded form, three characters wider than the `2026-08-16T09:28:53.123Z` shape.
 */
const WIDEST_TIME = new Date(8.64e15).toISOString()

/** Everything `log` puts in front of the serialised arguments. */
function composePrefix(time: string, level: LogLevel): string {
  return `${time} [${level}] `
}

// Measured off the composition `log` actually performs, at its widest, rather than written down as a
// literal. A literal goes stale silently: at 33 it was right for today's clock and both forwarded
// levels, but a date outside the 0–9999 year range — which a test suite with a faked clock can
// produce — composed 4099 characters and split one alert into two sends with nothing to show for it.
const PREFIX_CHARS = Math.max(...FORWARDED_LEVELS.map((level) => composePrefix(WIDEST_TIME, level).length))

// Telegram is an alerting channel, not a log store: the process-wide `totalChars` of 262144 would
// turn one oversized line into 64 sends, tripping the per-chat flood limit. Bounding the serialiser
// so that prefix plus payload still fit one Bot API message keeps a log line to a single send.
const TELEGRAM_LIMITS: Readonly<Partial<IArgsStringifyLimits>> = Object.freeze({
  totalChars: TELEGRAM_MESSAGE_CHARS - PREFIX_CHARS,
})

export interface ITransportTelegramConfig {
  /**
   * Overrides for the serialiser's bounds, merged over `ARGS_STRINGIFY_LIMITS` and then over this
   * transport's own `totalChars` of {@link TELEGRAM_MESSAGE_CHARS} minus the prefix.
   *
   * The Bot API caps a message at 4096 characters and `TelegramMessenger` splits anything longer into
   * that many separate sends, so here the bounds decide how many messages one log line costs. Raising
   * `totalChars` past the default buys detail at one extra send per 4096 characters.
   */
  limits?: Partial<IArgsStringifyLimits>
}

export class TransportTelegram implements TransportInterface {
  protected messenger: TelegramMessenger
  protected readonly stringify: (...args: unknown[]) => string

  public constructor(messenger: TelegramMessenger, config: ITransportTelegramConfig = {}) {
    this.messenger = messenger
    this.stringify = createArgsStringify({ ...TELEGRAM_LIMITS, ...definedLimits(config.limits) })
  }

  public log(level: LogLevel, ...msg: any[]): void {
    if (FORWARDED_LEVELS.includes(level)) {
      try {
        const message = this.stringify(...msg)

        const time = new Date().toISOString()
        // eslint-disable-next-line no-console
        this.messenger.send(`${composePrefix(time, level)}${message}`, process.env.TELEGRAM_CHANNEL_ID || '').catch(console.error)
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error(e)
      }
    }
  }
}
