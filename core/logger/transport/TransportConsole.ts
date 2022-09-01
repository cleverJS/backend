import { LogLevel, TransportInterface } from './TransportInterface'

export class TransportConsole implements TransportInterface {
  /**
   * @param level
   * @param msg
   */
  public log(level: LogLevel, ...msg: any[]): void {
    const time = new Date().toISOString()
    console[level](`[${level}] ${time}: `, ...msg)
  }
}
