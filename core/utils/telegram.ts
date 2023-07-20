import { Telegraf } from 'telegraf'

import { loggerNamespace } from '../logger/logger'

import { chunkString } from './common'

export class TelegramMessenger {
  protected logger = loggerNamespace('TelegramMessenger')
  protected readonly botToken
  protected readonly channelId
  protected bot: Telegraf | null = null

  public constructor() {
    this.botToken = process.env.TELEGRAM_BOT_TOKEN || ''
    this.channelId = process.env.TELEGRAM_CHANNEL_ID || ''
    this.bot = new Telegraf(this.botToken)
  }

  public start(): boolean {
    let result = false
    if (this.botToken && this.channelId && this.bot) {
      this.logger.info('Telegram bot starting')
      // https://github.com/telegraf/telegraf/issues/1749
      this.bot.launch().catch(this.logger.error)
      result = true
    } else {
      if (!this.botToken) {
        this.logger.warn('Telegram token is not defined')
      }

      if (!this.channelId) {
        this.logger.warn('Telegram channel is not defined')
      }

      this.bot = null
    }

    return result
  }

  public stop(): void {
    if (this.botToken) {
      this.logger.info('Telegram stopping')
      if (this.bot) {
        this.bot.stop()
      }
    }
  }

  public async send(message: string): Promise<void> {
    if (this.bot) {
      const limit = 4096

      if (message.length >= limit) {
        const chunks = chunkString(message, limit)
        const promises = []
        for (let i = 0; i < chunks.length; i++) {
          promises.push(this.bot.telegram.sendMessage(this.channelId, chunks[i]))
        }

        await Promise.all(promises)
      } else {
        await this.bot.telegram.sendMessage(this.channelId, message)
      }
    }
  }
}

export const telegramMessenger = new TelegramMessenger()
