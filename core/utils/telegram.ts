import { Telegraf } from 'telegraf'

import { loggerNamespace } from '../logger/logger'

import { chunkString } from './common'

export class TelegramMessenger {
  protected logger = loggerNamespace('TelegramMessenger')
  protected bot: Telegraf

  /**
   *
   * @param {string} token - telegram bot token
   */
  public constructor(token: string) {
    this.bot = new Telegraf(token)
  }

  public start(): boolean {
    let result = false
    if (this.bot) {
      this.logger.info('Telegram bot starting')
      // https://github.com/telegraf/telegraf/issues/1749
      this.bot.launch().catch(this.logger.error)
      result = true
    }

    return result
  }

  public stop(): void {
    this.bot.stop()
  }

  public async send(message: string, channelID: string): Promise<void> {
    const limit = 4096

    if (message.length >= limit) {
      const chunks = chunkString(message, limit)
      const promises = []
      for (let i = 0; i < chunks.length; i++) {
        promises.push(this.bot.telegram.sendMessage(channelID, chunks[i]).catch(this.logger.error))
      }

      await Promise.all(promises)
    } else {
      await this.bot.telegram.sendMessage(channelID, message).catch(this.logger.error)
    }
  }
}
