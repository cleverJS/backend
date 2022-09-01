import { createClient } from 'redis'

import { loggerNamespace } from '../../logger/logger'

import { IRedisConfig } from './config'

/**
 * EX seconds -- Set the specified expire time, in seconds.
 * PX milliseconds -- Set the specified expire time, in milliseconds.
 * EXAT timestamp-seconds -- Set the specified Unix time at which the key will expire, in seconds.
 * PXAT timestamp-milliseconds -- Set the specified Unix time at which the key will expire, in milliseconds.
 * NX -- Only set the key if it does not already exist.
 * XX -- Only set the key if it already exist.
 * KEEPTTL -- Retain the time to live associated with the key.
 * GET -- Return the old string stored at key, or nil if key did not exist. An
 * error is returned and SET aborted if the value stored at key is not a string.
 */
export enum ESetTTLMode {
  ex = 'EX',
  px = 'PX',
  exat = 'EXAT',
  pxat = 'PXAT',
  nx = 'NX',
  xx = 'XX',
  keepttl = 'KEEPTTL',
  get = 'GET',
}

export class Redis {
  public readonly client
  protected logger = loggerNamespace('Redis')

  public constructor(config: IRedisConfig) {
    const { host, port, db } = config

    const options = {
      url: `redis://${host}:${port}`,
      database: db,
    }

    this.client = createClient(options)
    this.client
      .connect()
      .then(() => {
        this.logger.info('Redis connected')
      })
      .catch(this.logger.error)
    this.handle()
  }
  //
  // public get(key: string): Promise<string | null> {
  //   return this.client.get(key)
  // }
  //
  // public mget(keys: string[]): Promise<(string | null)[]> {
  //   return this.client.mGet(keys)
  // }
  //
  // public smembers(key: string): Promise<string[]> {
  //   return this.client.sMembers(key)
  // }
  //
  // public set(key: string, value: string, mode?: ESetTTLMode, ttl?: number): Promise<boolean> {
  //   return new Promise((resolve, reject) => {
  //     if (ttl && !mode) {
  //       mode = ESetTTLMode.px
  //     }
  //
  //     if (ttl && mode) {
  //       this.client.set(key, value, mode, ttl || 0, (err, result) => {
  //         if (!err && result === 'OK') {
  //           return resolve(true)
  //         }
  //         return reject(err)
  //       })
  //     } else {
  //       this.client.set(key, value, (err, result) => {
  //         if (!err && result === 'OK') {
  //           return resolve(true)
  //         }
  //
  //         return reject(err)
  //       })
  //     }
  //   })
  // }
  //
  // public del(keys: string[]): Promise<number> {
  //   return new Promise((resolve, reject) => {
  //     if (!keys.length) {
  //       resolve(0)
  //       return
  //     }
  //
  //     this.client.del(keys, (err: Error | null, result: number) => {
  //       if (!err && result >= 0) {
  //         return resolve(result)
  //       }
  //
  //       return reject(err)
  //     })
  //   })
  // }
  //
  // public exists(keys: string[]): Promise<number> {
  //   return new Promise((resolve, reject) => {
  //     this.client.exists(keys, (err: Error | null, result: number) => {
  //       if (!err && result >= 0) {
  //         return resolve(result)
  //       }
  //
  //       return reject(err)
  //     })
  //   })
  // }
  //
  // public keys(table: string): Promise<string[]> {
  //   return new Promise((resolve, reject) => {
  //     this.client.keys(`${table}:*`, (err: Error | null, result: string[]) => {
  //       if (!err && result) {
  //         return resolve(result)
  //       }
  //
  //       return reject(err)
  //     })
  //   })
  // }
  //
  public async destroy(): Promise<void> {
    await this.client.quit()
    this.logger.info('Redis connection closed')
  }

  private handle() {
    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err}`)
    })
  }
}
