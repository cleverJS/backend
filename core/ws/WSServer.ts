import WebSocket from 'ws'
import { v4 as uuidV4 } from 'uuid'
import { EventEmitter } from 'events'
import { Server } from 'http'
import { IWSRequest, WSRequest } from './WSRequest'
import { WSResponse } from './WSResponse'
import { loggerNamespace } from '../logger/logger'
import { IWSConfig } from './config'
import { WSRequestValidator } from './validator/WSRequestValidator'

const EVENT_REQUEST = 'request'
const KEEP_ALIVE_DEFAULT = 1000 * 60
const EVENT_CONNECT = 'connect'
const EVENT_DISCONNECT = 'disconnect'
const MESSAGE_SYSTEM_ERROR = 'System error'

export interface IConnection<T extends Record<string, any>> {
  id: string
  client: WebSocket
  keepAlive?: NodeJS.Timeout
  state: T
}

export type RequestHandler = (request: WSRequest, connection: IConnection<any>) => Promise<Record<string, any>>
interface Request {
  handler: RequestHandler
}

interface IHandlers {
  [k: string]: Map<string, Request>
}

export class WSServer {
  protected ws: WebSocket.Server | null = null
  protected bus: EventEmitter
  protected readonly logger = loggerNamespace('WSServer')
  protected readonly config: IWSConfig
  protected readonly connections: Map<string, IConnection<Record<string, any>>> = new Map()
  protected readonly keepAliveTimeout: number | null
  protected readonly handlers: IHandlers = {
    [EVENT_REQUEST]: new Map(),
  }
  protected readonly eventRequestCode: string = EVENT_REQUEST
  protected readonly validatorRequest: WSRequestValidator

  public constructor(config: IWSConfig, server?: Server) {
    this.validatorRequest = new WSRequestValidator()
    this.bus = new EventEmitter()
    this.config = config
    this.keepAliveTimeout = config.keepalive || KEEP_ALIVE_DEFAULT
    this.init(server)
  }

  /**
   * @param service
   * @param action
   * @param handler
   */
  public onRequest(service: string, action: string, handler: RequestHandler): () => Request | undefined {
    const key = `${service}:${action}`
    this.handlers[this.eventRequestCode].set(key, { handler })

    return (): Request | undefined => this.handlers[this.eventRequestCode].get(key)
  }

  /**
   * @param connection
   * @param response
   */
  public async send(connection: IConnection<any>, response: Promise<WSResponse | null>): Promise<void> {
    if (connection) {
      const { client } = connection

      if (client.readyState === WebSocket.OPEN) {
        const result = await response
        if (result) {
          client.send(result.toString())
        }
      } else if ([WebSocket.CLOSED, WebSocket.CLOSING].includes(client.readyState)) {
        this.logger.warn('Force closing')
        this.handleClose(connection)
        client.terminate()
      } else {
        this.logger.error(new Error(`Connection is not open: '${client.readyState}'`))
      }
    }
  }

  /**
   */
  public getConnections(): IConnection<any>[] {
    return [...this.connections.values()]
  }

  /**
   */
  public getConnection(id: string): IConnection<any> {
    const connection = this.connections.get(id)
    if (!connection) {
      throw new Error('Connection was not found')
    }
    return connection
  }

  /**
   */
  public destroy(): void {
    if (this.ws) {
      this.logger.info('server destroy')
      this.ws.close()
    }
  }

  public broadcast(cb: (connection: IConnection<any>) => Promise<WSResponse | null>): void {
    const connectionArray = Array.from(this.connections.values())
    for (let i = 0; i < connectionArray.length; i++) {
      const conn = connectionArray[i]
      if (conn.client.readyState === WebSocket.OPEN) {
        this.send(conn, cb(conn)).catch(this.logger.error)
      }
    }
  }

  /**
   */
  public onConnect(handler: (id: string) => void): () => EventEmitter {
    this.bus.addListener(EVENT_CONNECT, handler)
    return (): EventEmitter => this.bus.removeListener(EVENT_CONNECT, handler)
  }

  /**
   */
  public onDisconnect(handler: (state: any) => void): () => EventEmitter {
    this.bus.addListener(EVENT_DISCONNECT, handler)
    return (): EventEmitter => this.bus.removeListener(EVENT_DISCONNECT, handler)
  }

  protected init(server?: Server): void {
    const { port, path } = this.config
    if (server) {
      this.ws = new WebSocket.Server({ server, path })
    } else {
      this.ws = new WebSocket.Server({ path, port })
    }

    this.logger.info(`Websocket Server started on 0.0.0.0:${port}${path}`)
    this.ws.on('connection', (client: WebSocket) => {
      const id = uuidV4()
      const state: Record<string, any> = {}
      const connection: IConnection<any> = { id, client, state }
      this.connections.set(id, connection)
      this.logger.debug('connected: ', id)
      this.handleMessage(connection)
      this.handleKeepAlive(connection)
      this.handleClose(connection)
      this.handleError(connection)
      this.bus.emit(EVENT_CONNECT, id)
    })
  }

  /**
   * @param connection
   */
  protected handleMessage(connection: IConnection<any>): void {
    const { client, id } = connection
    client.on('message', (message: string) => {
      let requestObject: IWSRequest

      try {
        requestObject = JSON.parse(message)
      } catch (e) {
        this.logger.error('request parse error:', e)
        return
      }

      if (typeof requestObject !== 'object') {
        this.logger.error('request type error:', requestObject)
        this.sendError(requestObject, connection, 'HttpClient must be a serialized object').catch(this.logger.error)
        return
      }

      try {
        const request = new WSRequest(requestObject)
        this.logger.debug(`request from ${id}:`, request)
        const key = `${request.header.service}:${request.header.action}`
        const handler = this.handlers[this.eventRequestCode].get(key)
        if (handler) {
          const response = WSResponse.fromRequest(requestObject, handler.handler(request, connection))
          this.send(connection, response).catch(this.logger.error)
        } else {
          const messageError = `Handler does not exist ${key}`
          this.logger.error(messageError)
          this.sendError(requestObject, connection, messageError).catch(this.logger.error)
        }
      } catch (e) {
        let errMessage
        if (process.env.NODE_ENV === 'production') {
          errMessage = MESSAGE_SYSTEM_ERROR
        } else {
          errMessage = e.message || MESSAGE_SYSTEM_ERROR
        }
        this.logger.error(e)
        this.sendError(requestObject, connection, errMessage).catch(this.logger.error)
      }
    })
  }

  protected async sendError(requestObject: IWSRequest, connection: IConnection<any>, message: string): Promise<void> {
    const errorResponse = await WSResponse.fromRequest(requestObject, Promise.resolve({}), 'error')
    errorResponse.error = message
    return this.send(connection, Promise.resolve(errorResponse))
  }

  /**
   * @param connection
   */
  protected handleKeepAlive(connection: IConnection<any>): void {
    if (this.keepAliveTimeout) {
      connection.keepAlive = setInterval(() => {
        if (connection.client.readyState === WebSocket.OPEN) {
          connection.client.ping()
        } else {
          this.logger.debug('Try to WebSocket client ping but connection not ready.')
        }
      }, this.keepAliveTimeout)
    }
  }

  /**
   * @param id
   * @param client
   * @param keepAlive
   */
  protected handleClose({ id, client, keepAlive }: IConnection<any>): void {
    client.on('close', () => {
      if (keepAlive) {
        clearInterval(keepAlive)
      }
      const state = this.connections.get(id)?.state
      this.bus.emit(EVENT_DISCONNECT, state)
      this.connections.delete(id)
      this.logger.debug('disconnected: ', id)
    })
  }

  protected handleError({ id, client }: IConnection<any>): void {
    client.on('error', (err: Error) => {
      this.logger.error(`Connection ${id}: `, err)
    })
  }
}
