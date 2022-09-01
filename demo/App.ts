import cors from '@fastify/cors'
import { EventEmitter } from 'events'
import knex, { Knex } from 'knex'
import TypedEmitter from 'typed-emitter'

import { HttpServer } from '../core/http/HttpServer'
import { loggerNamespace } from '../core/logger/logger'
import { WSServer } from '../core/ws/WSServer'

import { cacheContainer } from './CacheContainer'
import { ISettings } from './configs/SettingsInterface'
import { ResourceContainer } from './ResourceContainer'
import { RouteContainer } from './RouteContainer'
import { ServiceContainer } from './ServiceContainer'
import { AppEvents } from './types/Events'

export class App {
  protected readonly logger = loggerNamespace('App')
  protected readonly httpServer: HttpServer
  protected readonly connection
  protected readonly wsServer: WSServer
  protected readonly appEventBus: TypedEmitter<AppEvents> = new EventEmitter() as TypedEmitter<AppEvents>

  public constructor(settings: ISettings) {
    this.httpServer = new HttpServer({ port: settings.websocket.port, host: 'localhost' })
    this.registerFastifyPlugins()
    const server = this.httpServer.getInstance()
    this.wsServer = new WSServer(settings.websocket, server)

    const config = settings.connection
    this.connection = knex(config)

    const resourceContainer = new ResourceContainer(this.connection)
    const serviceContainer = new ServiceContainer(resourceContainer, this.appEventBus)
    new RouteContainer(serviceContainer, this.wsServer, this.httpServer)
  }

  public async run(): Promise<void> {
    await this.checkConnection(this.connection, true)
    await this.httpServer.start()
  }

  // This will be called on process finish and terminate http server
  public destroy() {
    return async (): Promise<void> => {
      await this.wsServer.destroy()
      await this.httpServer.destroy()
      await cacheContainer.clear()
      await new Promise((resolve) => {
        this.connection.destroy(() => {
          resolve(true)
        })
        this.logger.info('DB connections closed')
      })
    }
  }

  protected registerFastifyPlugins(): void {
    this.httpServer.getServer().register(cors, {
      origin: true,
      credentials: true,
      allowedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'authorization', 'Content-Type'],
    })
  }

  private async checkConnection(connection: Knex, exitOnFail: boolean = true) {
    const { server, port, database } = connection.client.config.connection
    const serverString = `${server}:${port}:${database}`
    try {
      this.logger.info(`Connecting to ${serverString}`)
      const rows = await connection.raw('SELECT 1 as result')
      if (!rows || !rows.length || rows[0].result !== 1) {
        this.logger.warn(`Connection to ${serverString} FAILED`)
        if (exitOnFail) {
          this.logger.error('Shutdown application')
          // eslint-disable-next-line no-process-exit
          process.exit(1)
        }
      } else {
        this.logger.info(`Connection to ${serverString} SUCCESS`)
      }
    } catch (e) {
      this.logger.error(`Connection to ${serverString} FAILED`)
    }
  }
}
