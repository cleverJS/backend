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

  public async get(key: string): Promise<string> {
    return new Promise((resolve, reject) =>
      this.client.get(key, (err, result) => {
        if (!err) {
          return resolve(result)
        }
        return reject(result)
      })
    )
  }

  public async mget(keys: string[] | string): Promise<string[]> {
    return new Promise((resolve, reject) =>
      this.client.mget(keys, (err, result) => {
        if (!err && result) {
          return resolve(result)
        }
        return reject(result)
      })
    )
  }

  public async set(key: string, value: string): Promise<boolean> {
    return new Promise((resolve, reject) =>
      this.client.set(key, value, (err, result) => {
        if (!err && result === 'OK') {
          return resolve(true)
        }
        return reject(false)
      })
    )
  }

  public async del(keys: string[]): Promise<number> {
    return new Promise((resolve, reject) =>
      this.client.del(keys, (err, result) => {
        if (!err && result) {
          return resolve(result)
        }
        return reject(result)
      })
    )
  }

  public async exists(keys: string[]): Promise<number> {
    return new Promise((resolve, reject) =>
      this.client.exists(keys, (err, result) => {
        if (!err && result) {
          return resolve(result)
        }
        return reject(result)
      })
    )
  }

  public destroy() {
    this.client.quit(() => {
      logger.info('Redis connection closed')
    })
  }

  private handle() {
    this.client.on('error', err => {
      logger.error(`Redis error: ${err}`)
    })
  }
}
