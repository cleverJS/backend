import { LogLevel, TransportInterface } from './TransportInterface'
import { TelegramMessenger } from '../../utils/telegram'
import { argsStringify } from '../../utils/common'

export class TransportTelegram implements TransportInterface {
  protected messenger: TelegramMessenger

  public constructor(messenger: TelegramMessenger) {
    this.messenger = messenger
  }

  public log(level: LogLevel, ...msg: any[]): void {
    if (level === 'error' || level === 'warn') {
      try {
        const message = argsStringify(...msg)

        const time = new Date().toISOString()
        // eslint-disable-next-line no-console
        this.messenger.send(`${time} [${level}] ${message}`).catch(console.error)
      } catch (e: any) {
        // eslint-disable-next-line no-console
        console.error(e)
      }
    }
  }
}
