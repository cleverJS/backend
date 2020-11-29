import WebSocket from 'ws'
import { v4 as uuidV4 } from 'uuid'
import { EventEmitter } from 'events'
import { Server, IncomingMessage } from 'http'
import { IWSRequest, WSRequest } from './WSRequest'
import { EWSResponseType, WSResponse } from './WSResponse'
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
  isAlive: boolean
  remoteAddress?: string
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
  public ws: WebSocket.Server
  protected bus: EventEmitter
  protected readonly logger = loggerNamespace('WSServer')
  protected readonly config: IWSConfig
  protected readonly connections: Map<string, IConnection<Record<string, any>>> = new Map()
  protected readonly keepAliveTimeout: number
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
    this.ws = this.init(server)
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

      try {
        if (client.readyState === WebSocket.OPEN) {
          const result = await response
          if (result) {
            client.send(result.toString())
          }
        } else if ([WebSocket.CLOSED, WebSocket.CLOSING].includes(client.readyState)) {
          this.logger.warn('Force closing')
          client.terminate()
        } else {
          this.logger.error(new Error(`Connection is not open: '${client.readyState}'`))
          client.terminate()
        }
      } catch (e) {
        this.logger.error(e)
      }
    }
  }

  /**
   */
  public getConnections(): IConnection<any>[] {
    return Array.from(this.connections.values())
  }

  /**
   */
  public getConnection(id: string): IConnection<any> | undefined {
    return this.connections.get(id)
  }

  public terminateConnection(id: string): boolean {
    const connection = this.getConnection(id)

    if (connection) {
      connection.client.terminate()
      this.connections.delete(id)
      return true
    }

    return false
  }

  /**
   */
  public destroy(): void {
    if (this.ws) {
      this.logger.info('Server terminated')
      this.ws.close()
    }
  }

  public broadcast(cb: (connection: IConnection<any>) => Promise<WSResponse | null>): void {
    for (const toConnection of this.connections.values()) {
      if (toConnection.client.readyState === WebSocket.OPEN) {
        this.send(toConnection, cb(toConnection)).catch(this.logger.error)
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

  /**
   * @param connection
   */
  protected handleMessage(connection: IConnection<any>): void {
    const { client, id } = connection
    client.on('message', async (message: string) => {
      let requestObject: IWSRequest

      try {
        requestObject = JSON.parse(message)
      } catch (e) {
        this.logger.error('Request parse error:', e)
        return
      }

      if (!this.validatorRequest.validate(requestObject)) {
        this.logger.error(requestObject)
        // We cannot do anything
        return
      }

      const { uuid } = requestObject.header

      try {
        const request = new WSRequest(requestObject)
        this.logger.debug(`request from ${id}:`, request)
        const key = `${request.header.service}:${request.header.action}`
        const handler = this.handlers[this.eventRequestCode].get(key)
        if (handler) {
          const response = WSResponse.create(handler.handler(request, connection), EWSResponseType.response, uuid)
          this.send(connection, response).catch(this.logger.error)
        } else {
          const messageError = `Handler does not exist ${key}`
          this.logger.error(messageError)
          this.sendError(connection, messageError, uuid).catch(this.logger.error)
        }
      } catch (e) {
        let errMessage
        if (process.env.NODE_ENV === 'production') {
          errMessage = MESSAGE_SYSTEM_ERROR
        } else {
          errMessage = e.message || MESSAGE_SYSTEM_ERROR
        }
        this.logger.error(e)
        this.sendError(connection, errMessage, uuid).catch(this.logger.error)
      }
    })
  }

  protected async sendError(connection: IConnection<any>, message: string, requestUUID: string): Promise<void> {
    const response = await WSResponse.create(Promise.resolve({}), EWSResponseType.response, requestUUID)
    response.error = message
    return this.send(connection, Promise.resolve(response))
  }

  /**
   * Ping a client connection and terminate in case of unavailable.
   *
   * @param {IConnection<any>} connection
   */
  protected handleKeepAlive(connection: IConnection<any>): void {
    if (this.keepAliveTimeout) {
      connection.keepAlive = setInterval(() => {
        if (!connection.isAlive) {
          connection.client.terminate()
        }

        connection.isAlive = false
        connection.client.ping()
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
      const state = this.connections.get(id)?.state || {}
      this.bus.emit(EVENT_DISCONNECT, state)
      this.connections.delete(id)
      this.logger.debug('Disconnected: ', id)
    })
  }

  protected handleError({ id, client }: IConnection<any>): void {
    client.on('error', (err: Error) => {
      this.logger.error(`Connection ${id}: `, err)
    })
  }

  protected init(server?: Server): WebSocket.Server {
    const { port, path } = this.config
    let ws: WebSocket.Server
    if (server) {
      ws = new WebSocket.Server({ server, path })
      this.logger.info(`Websocket Server started on ws://0.0.0.0:${port}${path}`)
    } else {
      ws = new WebSocket.Server({ path, port, noServer: true })
    }

    ws.on('connection', (client: WebSocket, request: IncomingMessage) => {
      const id = uuidV4()
      const state: Record<string, any> = {}
      const connection: IConnection<any> = { id, client, state, isAlive: true, remoteAddress: request.socket.remoteAddress }
      this.connections.set(id, connection)
      this.handleMessage(connection)
      this.handleClose(connection)
      this.handleKeepAlive(connection)
      this.handleError(connection)
      this.bus.emit(EVENT_CONNECT, id)
      client.on('pong', () => {
        this.logger.debug('pong')
        connection.isAlive = true
      })
    })

    ws.on('close', () => {
      this.connections.clear()
    })

    return ws
  }
}
