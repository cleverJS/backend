import { Telegraf } from 'telegraf'

import { loggerNamespace } from '../logger/logger'

import { chunkString } from './common'

/**
 * Where this class reports its own delivery failures.
 *
 * Must not be the application logger. Applications register `TransportTelegram` on that logger, so an
 * error reported through it comes straight back as another `send`; while the Bot API keeps refusing,
 * each failure re-reports itself and a transient 429 sustains itself. Whatever is wired here has to
 * terminate outside Telegram: the default `console.error` does, and so does a logger carrying only
 * file transports.
 *
 * It may fail as it likes. A throw, and equally a rejected promise from the `async` form the `void`
 * return type accepts, is absorbed: `send` still resolves and `start` still leaves nothing unhandled.
 */
export type TOutOfBandErrorReporter = (...args: unknown[]) => void

export interface ITelegramMessengerOptions {
  /** Defaults to `console.error`. See {@link TOutOfBandErrorReporter} for what may be wired here. */
  reportError?: TOutOfBandErrorReporter
}

export class TelegramMessenger {
  protected logger = loggerNamespace('TelegramMessenger')
  protected defaultChannelID?: string
  protected bot: Telegraf
  protected readonly reportError: TOutOfBandErrorReporter

  /**
   *
   * @param {string} token - telegram bot token
   * @param {string} defaultChannelID - channel or chat id
   * @param {ITelegramMessengerOptions} options - reporting of this bot's own delivery failures
   */
  public constructor(token: string, defaultChannelID?: string, options: ITelegramMessengerOptions = {}) {
    this.bot = new Telegraf(token)
    this.defaultChannelID = defaultChannelID
    this.reportError = options.reportError ?? ((...args: unknown[]): void => console.error(...args))
  }

  public start(): boolean {
    let result = false
    if (this.bot) {
      // `info` is not forwarded by `TransportTelegram`, so it cannot re-enter `send`.
      this.logger.info('Telegram bot starting')
      // https://github.com/telegraf/telegraf/issues/1749
      this.bot.launch().catch((error: unknown) => this.report(error))
      result = true
    }

    return result
  }

  public stop(): void {
    this.bot.stop()
  }

  public async send(message: string, channelID?: string): Promise<void> {
    const limit = 4096

    if (!channelID && this.defaultChannelID) {
      channelID = this.defaultChannelID
    }

    // Each rejection is handled where it happens rather than propagated: callers have always been
    // able to omit `.catch`, and letting `send` reject would turn that into a process-killing
    // unhandled rejection. The handler must stay off `this.logger` — see TOutOfBandErrorReporter —
    // and must go through `report`, which is what keeps an injected reporter from re-opening the
    // very hole these handlers close.
    if (channelID) {
      if (message.length >= limit) {
        const chunks = chunkString(message, limit)
        const promises: Promise<unknown>[] = []
        for (let i = 0; i < chunks.length; i++) {
          promises.push(this.bot.telegram.sendMessage(channelID, chunks[i]).catch((error: unknown) => this.report(error)))
        }

        await Promise.all(promises)
      } else {
        await this.bot.telegram.sendMessage(channelID, message).catch((error: unknown) => this.report(error))
      }
    }
  }

  /**
   * The single way this class reaches its reporter, because a reporter is injected and can fail in
   * two ways that a bare `.catch(this.reportError)` turns straight back into the failure mode the
   * `.catch` was there to prevent.
   *
   * It can throw synchronously; and `TOutOfBandErrorReporter` returns `void`, which TypeScript lets
   * an `async` function satisfy without a cast, so the most natural shape of all —
   * `async (...args) => { await postToSlack(...) }` — hands back a promise that may reject and that
   * `.catch` then adopts. Either one makes `send` reject, and in `start`, where nothing follows the
   * handler, it becomes an unhandled rejection the caller has no way to defend against.
   */
  protected report(...args: unknown[]): void {
    // Read off `this` first so the reporter is still invoked unbound, exactly as it was when it was
    // handed to `.catch` directly.
    const reportError = this.reportError

    try {
      void Promise.resolve(reportError(...args) as unknown).catch(() => undefined)
    } catch {
      // Reporting is the last step of failure handling: there is nowhere left to report a failure of
      // the reporter itself to, and anything thrown from here would break the contract it serves.
    }
  }
}
