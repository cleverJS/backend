import { Client } from '@elastic/elasticsearch'
import { EventEmitter } from 'events'
import knex, { Knex } from 'knex'
import TypedEmitter from 'typed-emitter'

import { HttpServer } from '../../core/http/HttpServer'
import { logger, loggerNamespace } from '../../core/logger/logger'
import { FSWrapper } from '../../core/utils/fsWrapper'
import { WSServer } from '../../core/ws/WSServer'
import { cacheContainer } from '../../demo/CacheContainer'
import { settings as demoSettings } from '../../demo/configs'
import { ISettings } from '../../demo/configs/SettingsInterface'
import { ServiceContainer } from '../../demo/ServiceContainer'
import { AppEvents } from '../../demo/types/Events'

export class DemoAppContainer {
  public readonly wsServer: WSServer
  public readonly elasticClient: Client
  public readonly connectionConfig: Knex.Sqlite3ConnectionConfig
  public readonly connection
  public readonly serviceContainer: ServiceContainer
  public readonly httpServer: HttpServer
  protected readonly logger = loggerNamespace('App')
  protected readonly appEventBus: TypedEmitter<AppEvents> = new EventEmitter() as TypedEmitter<AppEvents>

  public constructor(settings: ISettings) {
    this.elasticClient = new Client({
      node: 'http://localhost:9200',
    })
    this.httpServer = new HttpServer({ port: settings.websocket.port, host: 'localhost' })
    const server = this.httpServer.getInstance()
    this.wsServer = new WSServer(settings.websocket, server)

    this.connectionConfig = settings.connection.connection as Knex.Sqlite3ConnectionConfig
    // this.createDatabase(this.connectionConfig.filename)

    this.connection = knex(settings.connection)

    this.serviceContainer = new ServiceContainer(this.connection, this.appEventBus)
  }

  public async run(): Promise<void> {
    try {
      const rows = await this.connection.raw<{ result: number }[]>('SELECT 1 as result')
      if (!rows || !rows.length || rows[0].result !== 1) {
        throw new Error()
      }
      this.logger.info('DB connection successful')
    } catch (e) {
      this.logger.warn('Cannot connect to DB')
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }

    await this.httpServer.start()
  }

  // This will be called on process finish and terminate http server
  public destroy() {
    return async (): Promise<void> => {
      await this.wsServer.destroy()
      await this.httpServer.destroy()
      await new Promise((resolve) => {
        this.connection.destroy(() => {
          resolve(true)
        })
        this.logger.info('DB connections closed')
      })
      await new Promise((resolve) => {
        this.elasticClient.close(() => {
          logger.info('Elastic connections closed')
          resolve(true)
        })
      })
      await cacheContainer.clear()
    }
  }

  protected createDatabase(filename: string) {
    FSWrapper.removeSync(filename)
    FSWrapper.createFileSync(filename)
  }
}

export const demoAppContainer = new DemoAppContainer(demoSettings)
