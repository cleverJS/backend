import { EventEmitter } from 'events'
import { IncomingMessage, Server } from 'http'
import TypedEmitter from 'typed-emitter'
import { types } from 'util'
import { v4 as uuidV4 } from 'uuid'
import WebSocket, { WebSocketServer } from 'ws'

import { loggerNamespace } from '../logger/logger'

import { IWSConfig } from './config'
import { wsRequestValidator } from './validator/WSRequestValidator'
import { IWSRequest, WSRequest } from './WSRequest'
import { WSResponse } from './WSResponse'

export const WS_DEBUG = (process.env.WS_DEBUG || 'false') === 'true'

const KEEP_ALIVE_DEFAULT = 1000 * 60
const EVENT_CONNECT = 'WS_CONNECT'
const EVENT_DISCONNECT = 'WS_DISCONNECT'
const MESSAGE_SYSTEM_ERROR = 'System error'

export interface IConnectionInfo {
  id: string
  remoteAddress?: string
  state: any
  request: IncomingMessage
}

export type RequestHandler<T = Record<string, any>> = (
  request: WSRequest<T>,
  connectionInfo: IConnectionInfo,
  client: WebSocket
) => Promise<Record<string, any>>

type IWSServerEvents = {
  [EVENT_CONNECT]: (client: WebSocket) => void
  [EVENT_DISCONNECT]: (connectionInfo: IConnectionInfo) => void
}

export class WSServer {
  public ws: WebSocket.Server
  public readonly connectionInfoMap: Map<WebSocket, IConnectionInfo> = new Map()
  protected bus: TypedEmitter<IWSServerEvents>
  protected readonly logger = loggerNamespace('WSServer')
  protected readonly keepAliveTimeout: number
  protected keepAliveTimer: NodeJS.Timer | null = null
  protected readonly handlers: Map<string, RequestHandler<any>> = new Map()

  public constructor(config: IWSConfig, server?: Server) {
    this.bus = new EventEmitter() as TypedEmitter<IWSServerEvents>
    this.keepAliveTimeout = config.keepalive || KEEP_ALIVE_DEFAULT
    this.ws = this.init(config, server)
  }

  /**
   * @param service
   * @param action
   * @param handler
   */
  public onRequest<T>(service: string, action: string, handler: RequestHandler<T>): void {
    const key = `${service}:${action}`
    this.handlers.set(key, handler)
  }

  /**
   * @param client
   * @param response
   */
  public async send(client: WebSocket, response: WSResponse): Promise<void> {
    if (client) {
      try {
        if (client.readyState === WebSocket.CONNECTING) {
          this.logger.warn('connecting')
          await WSServer.waitForSocketState(client, WebSocket.CONNECTING)
        }

        if (client.readyState === WebSocket.OPEN) {
          client.send(response.toString())
        } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
          const info = this.connectionInfoMap.get(client)
          this.logger.warn('force closing')
          if (info) {
            this.logger.warn(`clear connection ${JSON.stringify(info)}`)
            this.connectionInfoMap.delete(client)
          }

          client.terminate()
        } else {
          this.logger.error(new Error(`connection is not open: '${client.readyState}'`))
          this.connectionInfoMap.delete(client)
          client.terminate()
        }
      } catch (e) {
        this.logger.error(e)
      }
    }
  }

  /**
   */
  public async destroy(): Promise<void> {
    if (this.ws) {
      await new Promise((resolve) => {
        this.ws.close(() => {
          resolve(true)
        })
      })
      this.logger.info('closed')
    }
  }

  public broadcast(cb: (connectionInfo: IConnectionInfo, client: WebSocket) => Promise<WSResponse | null>, clients?: Set<WebSocket>): void {
    if (!clients) {
      clients = this.ws.clients
    }

    clients.forEach(async (client) => {
      if (client.readyState === WebSocket.OPEN) {
        const connectionInfo = this.connectionInfoMap.get(client)
        if (connectionInfo) {
          const response = await cb(connectionInfo, client)
          if (response) {
            this.send(client, response).catch(this.logger.error)
          }
        }
      }
    })
  }

  /**
   */
  public onConnect(handler: (client: WebSocket) => Promise<void>): () => EventEmitter {
    this.bus.addListener(EVENT_CONNECT, handler)
    return (): EventEmitter => this.bus.removeListener(EVENT_CONNECT, handler)
  }

  /**
   */
  public onDisconnect(handler: (connectionInfo: IConnectionInfo) => Promise<void>): () => EventEmitter {
    this.bus.addListener(EVENT_DISCONNECT, handler)
    return (): EventEmitter => this.bus.removeListener(EVENT_DISCONNECT, handler)
  }

  /**
   * @param client
   */
  protected handleMessage(client: WebSocket): void {
    client.on('message', async (message: any) => {
      const requestObject: IWSRequest | null = this.requestMessageToObject(message)

      if (!requestObject) {
        return
      }

      const isValid = await wsRequestValidator.validate(requestObject)
      if (!isValid) {
        this.logger.error(requestObject)
        // TODO: We cannot do anything ?
        return
      }

      const { uuid } = requestObject.header

      try {
        const request = new WSRequest(requestObject)
        if (WS_DEBUG) {
          this.logger.debug('request', request)
        }

        const key = `${request.header.service}:${request.header.action}`
        const handler = this.handlers.get(key)
        if (handler) {
          const connectionInfo = this.connectionInfoMap.get(client)
          if (connectionInfo) {
            const payload = await handler(request, connectionInfo, client)
            const response = WSResponse.create(uuid, payload, request.header.service, request.header.action)
            this.send(client, response).catch(this.logger.error)
          }
        } else {
          const messageError = `Handler does not exist ${key}`
          this.logger.error(messageError)
          this.sendError(client, messageError, uuid).catch(this.logger.error)
        }
      } catch (e) {
        let errMessage
        if (process.env.NODE_ENV === 'production') {
          errMessage = MESSAGE_SYSTEM_ERROR
        } else if (types.isNativeError(e)) {
          errMessage = e.message || MESSAGE_SYSTEM_ERROR
        } else {
          errMessage = MESSAGE_SYSTEM_ERROR
        }

        this.logger.error(e)
        this.sendError(client, errMessage, uuid).catch(this.logger.error)
      }
    })
  }

  protected async sendError(client: WebSocket, message: string, requestUUID: string | number): Promise<void> {
    const payload = {
      status: 'fail',
      error: message,
    }

    const response = await WSResponse.create(requestUUID, payload)
    return this.send(client, response)
  }

  /**
   * @param client WebSocket
   */
  protected handleClose(client: WebSocket): void {
    client.on('close', async (code: number, reason: Buffer) => {
      const connectionInfo = this.connectionInfoMap.get(client)
      if (connectionInfo) {
        this.bus.emit(EVENT_DISCONNECT, connectionInfo)
        this.connectionInfoMap.delete(client)
      }
    })
  }

  protected handleError(client: WebSocket): void {
    client.on('error', (err: Error) => {
      const connectionInfo = this.connectionInfoMap.get(client)
      this.logger.error('handleError:', err, connectionInfo)
      if (connectionInfo) {
        this.connectionInfoMap.delete(client)
      }
    })
  }

  protected init(config: IWSConfig, server?: Server): WebSocket.Server {
    const { port, path } = config
    let ws: WebSocket.Server
    if (server) {
      ws = new WebSocketServer({ server, path })
    } else {
      ws = new WebSocketServer({ path, port, noServer: true })
    }

    this.logger.info(`started on ws://0.0.0.0:${port}${path}`)

    ws.on('connection', async (client: WebSocket, request: IncomingMessage) => {
      this.setKeepAlive(client, true)
      const id = uuidV4()
      const state: Record<string, any> = {}
      const remoteAddress = request.headers.origin || request.socket.remoteAddress

      const connectionInfo: IConnectionInfo = { id, state, remoteAddress, request }
      this.connectionInfoMap.set(client, connectionInfo)
      this.handleError(client)
      this.handleClose(client)
      this.handleMessage(client)
      this.bus.emit(EVENT_CONNECT, client)
      client.on('pong', () => {
        this.setKeepAlive(client, true)
      })
    })

    this.handleKeepAlive()

    ws.on('close', () => {
      if (this.keepAliveTimer) {
        clearInterval(this.keepAliveTimer)
        this.connectionInfoMap.clear()
      }
    })

    return ws
  }

  /**
   * Ping a client connections and terminate in case of unavailable.
   *
   */
  protected handleKeepAlive(): void {
    this.keepAliveTimer = setInterval(() => {
      this.ws.clients.forEach((client: WebSocket) => {
        if (!this.isAlive(client)) {
          client.terminate()
          return
        }

        this.setKeepAlive(client, false)
        client.ping()
      })
    }, this.keepAliveTimeout)
  }

  protected setKeepAlive(client: WebSocket, value: boolean) {
    // @ts-ignore
    client.keepAlive = value
  }

  protected isAlive(client: WebSocket) {
    // @ts-ignore
    return client.keepAlive
  }

  protected requestMessageToObject(message: any) {
    let requestObject: IWSRequest | null = null

    try {
      if (Buffer.isBuffer(message)) {
        requestObject = JSON.parse(message.toString())
      } else if (typeof message === 'string') {
        requestObject = JSON.parse(message)
      } else {
        this.logger.error('Type of message unknown')
      }
    } catch (e) {
      this.logger.error('Request parse error:', e)
    }

    return requestObject
  }

  public static async gracefulClose(client: WebSocket): Promise<void> {
    client.close()
    await WSServer.waitForSocketState(client, client.CLOSED)
  }

  public static async waitForSocketState(client: WebSocket, state: 0 | 1 | 2 | 3, maxNumberOfAttempts: number = 200): Promise<true> {
    return new Promise((resolve, reject) => {
      const intervalTime = 200 // ms

      let currentAttempt = 0
      const interval = setInterval(() => {
        if (currentAttempt > maxNumberOfAttempts - 1) {
          clearInterval(interval)
          reject(new Error('Maximum number of attempts exceeded'))
        } else if (client.readyState === state) {
          clearInterval(interval)
          resolve(true)
        }
        currentAttempt++
      }, intervalTime)
    })
  }
}
