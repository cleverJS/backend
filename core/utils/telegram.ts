import { Telegraf } from 'telegraf'
import { chunkString } from './common'
import { loggerNamespace } from '../logger/logger'

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

  public async start(): Promise<boolean> {
    let result = false
    if (this.botToken && this.channelId && this.bot) {
      this.logger.info('Telegram bot starting')
      await this.bot.launch()
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
      if (message.length > 9500) {
        const chunks = chunkString(message, 9500)
        for (let i = 0; chunks.length; i++) {
          await this.bot.telegram.sendMessage(this.channelId, chunks[i])
        }
      } else {
        await this.bot.telegram.sendMessage(this.channelId, message)
      }
    }
  }
}

export const telegramMessenger = new TelegramMessenger()
