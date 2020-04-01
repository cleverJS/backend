import WebSocket from 'ws'
import { v4 as uuid } from 'uuid'
import { EventEmitter } from 'events'
import { WSRequest } from './WSRequest'
import { WSResponse } from './WSResponse'
import { loggerNamespace, logger } from '../logger/logger'
import { IWSConfig } from './config'
import { AbstractObject } from '../AbstractObject'
import { resolvePromiseMap } from '../utils/promise'

export const EVENT_REQUEST = 'request'
const KEEP_ALIVE_DEFAULT = 1000 * 60
const EVENT_CONNECT = 'connect'
const EVENT_DISCONNECT = 'disconnect'

export interface IConnection {
  id: string
  client: WebSocket
  keepAlive?: NodeJS.Timeout
  state: AbstractObject
}

export type RequestHandler = (request: WSRequest, connection: IConnection) => Promise<AbstractObject>
export type RequestValidator = (request: WSRequest) => Promise<{ status: 'success' | 'fail' | 'error'; message?: string }>
interface Request {
  handler: RequestHandler
  validator?: RequestValidator
}

interface IHandlers {
  [EVENT_REQUEST]: Map<string, Request>
}

export class WSServer {
  protected ws: WebSocket.Server | null = null
  protected bus: EventEmitter = new EventEmitter()
  protected readonly logger = loggerNamespace('WSServer')
  protected readonly port: number
  protected readonly connections: Map<string, IConnection> = new Map()
  protected readonly keepAliveTimeout: number | null
  protected readonly handlers: IHandlers = {
    [EVENT_REQUEST]: new Map(),
  }

  public constructor(config: IWSConfig) {
    this.port = config.port
    this.keepAliveTimeout = config.keepalive || KEEP_ALIVE_DEFAULT
    this.init()
  }

  /**
   * @param service
   * @param action
   * @param handler
   * @param validator
   */
  public onRequest(service: string, action: string, handler: RequestHandler, validator?: RequestValidator): Function {
    if (!this.handlers[EVENT_REQUEST]) {
      this.handlers[EVENT_REQUEST] = new Map()
    }
    const key = `${service}:${action}`
    this.handlers[EVENT_REQUEST].set(key, { handler, validator })

    return () => this.handlers[EVENT_REQUEST].get(key)
  }

  /**
   * @param id
   * @param response
   */
  public async send(id: string, response: WSResponse) {
    try {
      response.validate()
    } catch (e) {
      this.logger.error('response validate error:', e)
    }

    const connection = this.getConnection(id)
    if (connection) {
      const { client } = connection
      if (client.readyState === WebSocket.OPEN) {
        client.send(response.toString())
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
    this.ws && this.ws.close()
  }

  public async broadcast(cb: (connection: IConnection) => Promise<WSResponse | null>) {
    const map = new Map()
    for (const [connectionId, connection] of this.connections.entries()) {
      map.set(connectionId, cb(connection))
    }

    const resolves = await resolvePromiseMap<string, WSResponse | null>(map)

    for (const { id, item } of resolves) {
      if (id && item) {
        this.send(id, item)
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

  /**
   */
  protected init() {
    this.ws = new WebSocket.Server({ port: this.port })

    logger.info(`Websocket Server started on 0.0.0.0:${this.port}`)
    this.ws.on('connection', async (client: WebSocket) => {
      const id = uuid()
      const state = {}
      const connection: IConnection = { id, client, state }
      this.connections.set(id, connection)
      this.logger.debug('connected: ', id)
      this.handleMessage(connection)
      this.handleKeepAlive(connection)
      this.handleClose(connection)
      this.bus.emit(EVENT_CONNECT, id)
    })
  }

  /**
   * @param id
   * @param client
   */
  protected handleMessage({ id, client }: IConnection) {
    client.on('message', async (message: string) => {
      let requestObject: any

      try {
        requestObject = JSON.parse(message)
      } catch (e) {
        const errorResponse = WSResponse.fromRequest(requestObject, 'error')
        errorResponse.error = e.message || 'System error'
        this.logger.error('request parse error:', e)
        this.send(id, errorResponse)
        return
      }

      if (typeof requestObject !== 'object') {
        const errorResponse = WSResponse.fromRequest(requestObject, 'error')
        errorResponse.error = 'HttpClient must be a serialized object'
        this.logger.error('request type error:', requestObject)
        this.send(id, errorResponse)
        return
      }

      try {
        const request = new WSRequest(requestObject)
        this.logger.debug(`request from ${id}:`, request)
        const key = `${request.header.service}:${request.header.action}`
        const handler = this.handlers[EVENT_REQUEST].get(key)
        if (handler) {
          const response = WSResponse.fromRequest(requestObject)
          handler.handler(request, this.getConnection(id)).then(async payload => {
            response.payload = payload
            this.send(id, response)
          })
          return
        }
      } catch (e) {
        const errorResponse = WSResponse.fromRequest(requestObject, 'error')
        if (process.env.NODE_ENV === 'production') {
          errorResponse.error = 'System error'
        } else {
          errorResponse.error = e.message || 'System error'
        }

        this.logger.error('request validate error:', e)
        this.send(id, errorResponse)
        return
      }
    })
  }

  /**
   * @param connection
   */
  protected handleKeepAlive(connection: IConnection) {
    if (this.keepAliveTimeout) {
      connection.keepAlive = setInterval(() => {
        connection.client.ping()
      }, this.keepAliveTimeout)
    }
  }

  /**
   * @param id
   * @param client
   * @param keepAlive
   */
  protected handleClose({ id, client, keepAlive }: IConnection) {
    client.on('close', async () => {
      keepAlive && clearInterval(keepAlive)
      this.connections.delete(id)
      this.logger.debug('disconnected: ', id)
      this.bus.emit(EVENT_DISCONNECT, id)
    })
  }
}
