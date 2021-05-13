import { Knex, knex } from 'knex'
import cors from 'fastify-cors'
import { EventEmitter } from 'events'
import TypedEmitter from 'typed-emitter'
import { WSServer } from '../core/ws/WSServer'
import { ISettings } from './configs/SettingsInterface'
import { ResourceContainer } from './ResourceContainer'
import { ServiceContainer } from './ServiceContainer'
import { RouteContainer } from './RouteContainer'
import { HttpServer } from '../core/http/HttpServer'
import { loggerNamespace } from '../core/logger/logger'
import { AppEvents } from './types/Events'

export class App {
  protected readonly logger = loggerNamespace('App')
  protected readonly httpServer: HttpServer
  protected readonly connection: Knex
  protected readonly wsServer: WSServer
  protected readonly appEventBus: TypedEmitter<AppEvents> = new EventEmitter()

  public constructor(settings: ISettings) {
    this.httpServer = new HttpServer({ port: settings.websocket.port, host: 'localhost' })
    this.registerFastifyPlugins()
    const server = this.httpServer.getInstance()
    this.wsServer = new WSServer(settings.websocket, server)

    this.connection = knex(settings.connection)

    const resourceContainer = new ResourceContainer(this.connection)
    const serviceContainer = new ServiceContainer(resourceContainer, this.appEventBus)
    new RouteContainer(serviceContainer, this.wsServer, this.httpServer)
  }

  public async run(): Promise<void> {
    await this.httpServer.start()
    try {
      const rows = await this.connection.raw('SELECT 1 as result')
      if (!rows || !rows.length || rows[0]['result'] !== 1) {
        throw new Error()
      }
      this.logger.info('DB connection successful')
    } catch (e) {
      this.logger.warn('Cannot connect to DB')
      // eslint-disable-next-line no-process-exit
      process.exit(1)
    }
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
    }
  }

  protected registerFastifyPlugins(): void {
    this.httpServer.getServer().register(cors, {
      origin: true,
      credentials: true,
      allowedHeaders: ['Access-Control-Allow-Origin', 'Access-Control-Allow-Headers', 'authorization', 'Content-Type'],
    })
  }
}
