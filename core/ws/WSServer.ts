import WebSocket from 'ws'
import { v4 as uuidV4 } from 'uuid'
import { EventEmitter } from 'events'
import { Server } from 'http'
import { IWSRequest, WSRequest } from './WSRequest'
import { WSResponse } from './WSResponse'
import { logger, loggerNamespace } from '../logger/logger'
import { IWSConfig } from './config'
import { resolvePromiseMap } from '../utils/promise'
import { WSRequestValidator } from './validator/WSRequestValidator'

const EVENT_REQUEST = 'request'
const KEEP_ALIVE_DEFAULT = 1000 * 60
const EVENT_CONNECT = 'connect'
const EVENT_DISCONNECT = 'disconnect'
const MESSAGE_SYSTEM_ERROR = 'System error'

export interface IConnection {
  id: string
  client: WebSocket
  keepAlive?: NodeJS.Timeout
  state: Record<string, any>
}

export type RequestHandler = (request: WSRequest, connection: IConnection) => Promise<Record<string, any>>
export type RequestValidator = (request: WSRequest) => Promise<{ status: 'success' | 'fail' | 'error'; message?: string }>
interface Request {
  handler: RequestHandler
  validator?: RequestValidator
}

interface IHandlers {
  [k: string]: Map<string, Request>
}

export class WSServer {
  protected ws: WebSocket.Server | null = null
  protected bus: EventEmitter
  protected readonly logger = loggerNamespace('WSServer')
  protected readonly port: number
  protected readonly connections: Map<string, IConnection> = new Map()
  protected readonly keepAliveTimeout: number | null
  protected readonly handlers: IHandlers = {
    [EVENT_REQUEST]: new Map(),
  }
  protected readonly eventRequestCode: string = EVENT_REQUEST
  protected readonly validatorRequest: WSRequestValidator

  public constructor(config: IWSConfig, server?: Server) {
    this.validatorRequest = new WSRequestValidator()
    this.bus = new EventEmitter()
    this.port = config.port
    this.keepAliveTimeout = config.keepalive || KEEP_ALIVE_DEFAULT
    this.init(server)
  }

  /**
   * @param service
   * @param action
   * @param handler
   * @param validator
   */
  public onRequest(service: string, action: string, handler: RequestHandler, validator?: RequestValidator): Function {
    const key = `${service}:${action}`
    this.handlers[this.eventRequestCode].set(key, { handler, validator })

    return () => this.handlers[this.eventRequestCode].get(key)
  }

  /**
   * @param connection
   * @param response
   */
  public send(connection: IConnection, response: WSResponse) {
    if (connection) {
      const { client } = connection

      if (client.readyState === WebSocket.OPEN) {
        client.send(response.toString())
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
  public getConnections(): IConnection[] {
    return [...this.connections.values()]
  }

  /**
   */
  public getConnection(id: string) {
    const connection = this.connections.get(id)
    if (!connection) {
      throw new Error('Connection was not found')
    }
    return connection
  }

  /**
   */
  public destroy() {
    if (this.ws) {
      this.ws.close()
    }
  }

  public async broadcast(cb: (connection: IConnection) => Promise<WSResponse | null>) {
    const map = new Map()

    for (const [connectionId, connection] of this.connections.entries()) {
      if (connection.client.readyState === WebSocket.OPEN) {
        map.set(connectionId, cb(connection))
      }
    }

    const resolves = await resolvePromiseMap<string, WSResponse | null>(map)

    for (let i = 0; i < resolves.length; i++) {
      const { id, item } = resolves[parseInt(`${i}`, 10)]
      const connection = this.connections.get(id)
      if (connection && item) {
        this.send(connection, item)
      }
    }
  }

  /**
   */
  public onConnect(handler: (id: string) => void): () => void {
    this.bus.addListener(EVENT_CONNECT, handler)
    return () => this.bus.removeListener(EVENT_CONNECT, handler)
  }

  /**
   */
  public onDisconnect(handler: (id: string) => void): () => void {
    this.bus.addListener(EVENT_DISCONNECT, handler)
    return () => this.bus.removeListener(EVENT_DISCONNECT, handler)
  }

  protected init(server?: Server) {
    if (server) {
      this.ws = new WebSocket.Server({ server })
    } else {
      this.ws = new WebSocket.Server({ port: this.port })
    }

    logger.info(`Websocket Server started on 0.0.0.0:${this.port}`)
    this.ws.on('connection', (client: WebSocket) => {
      const id = uuidV4()
      const state = {}
      const connection: IConnection = { id, client, state }
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
   * @param id
   * @param client
   */
  protected handleMessage({ id, client }: IConnection) {
    client.on('message', (message: string) => {
      let requestObject: IWSRequest

      try {
        requestObject = JSON.parse(message)
      } catch (e) {
        this.logger.error('request parse error:', e)
        return
      }

      const connection = this.getConnection(id)
      if (typeof requestObject !== 'object') {
        this.logger.error('request type error:', requestObject)
        this.sendError(requestObject, connection, 'HttpClient must be a serialized object')
        return
      }

      try {
        const request = new WSRequest(requestObject)
        if (this.validatorRequest.validate(request)) {
          this.logger.debug(`request from ${id}:`, request)
          const key = `${request.header.service}:${request.header.action}`
          const handler = this.handlers[this.eventRequestCode].get(key)
          if (handler) {
            const response = WSResponse.fromRequest(requestObject)
            handler
              .handler(request, connection)
              .then((payload: Record<string, any>) => {
                response.payload = payload
                return this.send(connection, response)
              })
              .catch(logger.error)
          } else {
            const messageError = `Handler does not exist ${key}`
            this.logger.error(messageError)
            this.sendError(requestObject, connection, messageError)
          }
        }
      } catch (e) {
        let errMessage = ''
        if (process.env.NODE_ENV === 'production') {
          errMessage = MESSAGE_SYSTEM_ERROR
        } else {
          errMessage = e.message || MESSAGE_SYSTEM_ERROR
        }
        this.logger.error(e)
        this.sendError(requestObject, connection, errMessage)
      }
    })
  }

  protected sendError(requestObject: IWSRequest, connection: IConnection, message: string) {
    const errorResponse = WSResponse.fromRequest(requestObject, 'error')
    errorResponse.error = message
    return this.send(connection, errorResponse)
  }

  /**
   * @param connection
   */
  protected handleKeepAlive(connection: IConnection) {
    if (this.keepAliveTimeout) {
      connection.keepAlive = setInterval(() => {
        if (connection.client.readyState === WebSocket.OPEN) {
          connection.client.ping()
        } else {
          logger.debug('Try to WebSocket client ping but connection not ready.')
        }
      }, this.keepAliveTimeout)
    }
  }

  /**
   * @param id
   * @param client
   * @param keepAlive
   */
  protected handleClose({ id, client, keepAlive }: IConnection) {
    client.on('close', () => {
      if (keepAlive) {
        clearInterval(keepAlive)
      }
      this.connections.delete(id)
      this.logger.debug('disconnected: ', id)
      this.bus.emit(EVENT_DISCONNECT, id)
    })
  }

  protected handleError({ id, client }: IConnection) {
    client.on('error', (err: Error) => {
      this.logger.error(`Connection ${id}: `, err)
    })
  }
}
