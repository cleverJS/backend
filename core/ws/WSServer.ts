import WebSocket from 'ws'
import { v4 as uuid } from 'uuid'
import { WSRequest } from './WSRequest'
import { WSResponse } from './WSResponse'
import { loggerNamespace } from '../logger/logger'
import { IWSConfig } from './config'
import { AbstractObject } from '../AbstractObject'
import { resolvePromiseMap } from '../utils/promise'

export const EVENT_REQUEST = 'request'
const KEEP_ALIVE_DEFAULT = 1000 * 60

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

class WSServer {
  private ws: WebSocket.Server | null = null
  private readonly logger = loggerNamespace('WSServer')
  private readonly port: number
  private readonly connections: Map<string, IConnection> = new Map()
  private readonly keepAliveTimeout: number | null
  private readonly handlers: IHandlers = {
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
  public send(id: string, response: WSResponse) {
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
  private init() {
    this.ws = new WebSocket.Server({ port: this.port })
    this.ws.on('connection', (client: WebSocket) => {
      const id = uuid()
      const state = {}
      const connection: IConnection = { id, client, state }
      this.connections.set(id, connection)
      this.logger.debug('connected: ', id)
      this.handleMessage(connection)
      this.handleKeepAlive(connection)
      this.handleClose(connection)
    })
  }

  /**
   * @param id
   * @param client
   */
  private handleMessage({ id, client }: IConnection) {
    client.on('message', async (message: string) => {
      let requestObject: any

      try {
        requestObject = JSON.parse(message)
      } catch (e) {
        const errorResponse = WSResponse.fromRequest(requestObject)
        errorResponse.error = e.message || 'System error'
        this.logger.error('request parse error:', e)
        this.send(id, errorResponse)
        return
      }

      if (typeof requestObject !== 'object') {
        const errorResponse = WSResponse.fromRequest(requestObject)
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
          if (handler.validator) {
            const validationResult = await handler.validator(request)
            if (validationResult.status !== 'success') {
              const errorResponse = WSResponse.fromRequest(requestObject)
              errorResponse.error = validationResult.message || ''
              this.logger.error('request type error:', requestObject)
              this.send(id, errorResponse)
              return
            }
          }

          const response = WSResponse.fromRequest(requestObject)
          response.payload = await handler.handler(request, this.getConnection(id))
          this.send(id, response)
        }
      } catch (e) {
        const errorResponse = WSResponse.fromRequest(requestObject)
        errorResponse.error = e.message || 'System error'
        this.logger.error('request validate error:', e)
        this.send(id, errorResponse)
        return
      }
    })
  }

  /**
   * @param connection
   */
  private handleKeepAlive(connection: IConnection) {
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
  private handleClose({ id, client, keepAlive }: IConnection) {
    client.on('close', () => {
      keepAlive && clearInterval(keepAlive)
      this.connections.delete(id)
      this.logger.debug('disconnected: ', id)
    })
  }
}

export { WSServer }
