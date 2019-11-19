export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface TransportInterface {
  log(level: LogLevel, ...msg: any[]): void
}
