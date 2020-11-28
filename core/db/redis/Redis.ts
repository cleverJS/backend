import redis, { RedisClient } from 'redis'
import { logger } from '../../logger/logger'
import { IRedisConfig } from './config'

export class Redis {
  public readonly client: RedisClient

  public constructor(config: IRedisConfig) {
    const { host, port, db } = config

    this.client = redis.createClient(port, host, {
      db,
    })
    this.handle()
  }

  public get(key: string): Promise<string | undefined> {
    return new Promise((resolve, reject) =>
      this.client.get(key, (err: Error | null, result: string | null) => {
        if (!err) {
          return resolve(result || undefined)
        }
        return reject(result)
      })
    )
  }

  public mget(keys: string[] | string): Promise<string[]> {
    return new Promise((resolve, reject) =>
      this.client.mget(keys, (err: Error | null, result: string[]) => {
        if (!err && result) {
          return resolve(result)
        }
        return reject(result)
      })
    )
  }

  public set(key: string, value: string): Promise<boolean> {
    return new Promise((resolve, reject) =>
      this.client.set(key, value, (err: Error | null, result: 'OK') => {
        if (!err && result === 'OK') {
          return resolve(true)
        }
        return reject(false)
      })
    )
  }

  public del(keys: string[]): Promise<number> {
    return new Promise((resolve, reject) =>
      this.client.del(keys, (err: Error | null, result: number) => {
        if (!err && result) {
          return resolve(result)
        }
        return reject(result)
      })
    )
  }

  public exists(keys: string[]): Promise<number> {
    return new Promise((resolve, reject) =>
      this.client.exists(keys, (err: Error | null, result: number) => {
        if (!err && result) {
          return resolve(result)
        }
        return reject(result)
      })
    )
  }

  public destroy(): void {
    this.client.quit(() => {
      logger.info('Redis connection closed')
    })
  }

  private handle() {
    this.client.on('error', (err) => {
      logger.error(`Redis error: ${err}`)
    })
  }
}
