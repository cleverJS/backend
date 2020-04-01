import mongo, { MongoClient, MongoError } from 'mongodb'
import { Ready } from '../../utils/ready'
import { logger } from '../../logger/logger'
import { IMongoConfig } from './config'

export class Mongo {
  private client?: mongo.MongoClient
  private connected = new Ready()
  private readonly url: string
  private readonly db: string

  constructor(config: IMongoConfig) {
    logger.info(config.url, config.db)
    this.url = config.url
    this.db = config.db

    mongo.MongoClient.connect(this.url, { useNewUrlParser: true, useUnifiedTopology: true }, (err: MongoError, client: MongoClient) => {
      if (err) {
        logger.error(err)
      }
      this.client = client
      this.connected.resolve()
    })
  }

  public async getDB() {
    const connection = await this.getClient()
    return connection ? connection.db(this.db) : null
  }

  public async destroy() {
    if (this.client) {
      logger.info('MongoDB connection closing')
      const connection = await this.getClient()
      if (connection) {
        connection.close((error: MongoError) => {
          logger.info([error])
          if (error) {
            logger.error(error)
          } else {
            logger.info('MongoDB connection closed')
          }
        })
      }
    }
  }

  protected async getClient() {
    await this.connected.promise
    return this.client
  }
}
