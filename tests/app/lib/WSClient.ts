import WebSocket, { CloseEvent, ErrorEvent, Event, MessageEvent } from 'ws'
import { v4 as uuid4 } from 'uuid'
import { EventEmitter } from 'events'
import { loggerNamespace } from '../../../core/logger/logger'
import { Ready } from '../../../core/utils/ready'

export const EVENT_OPEN = 'event_open'
export const EVENT_RECONNECT = 'event_reconnect'
export const EVENT_ERROR = 'event_error'
export const EVENT_CLOSE = 'event_close'
export const EVENT_TERMINATED = 'event_terminated'

const types = ['response', 'event', 'error'] as ['response', 'event', 'error']
type ResponseType = typeof types[number]

interface IRequestHeader {
  uuid: string
  service: string
  action: string
}

interface IResponseHeader {
  uuid: string
  service: string
  action: string
  name?: string
  type?: ResponseType
}

interface TResponse<T extends Record<string, any>> {
  header: IResponseHeader
  payload: Record<string, any>
  status: 'success' | 'error' | 'fail'
  data: T
  error?: string
}

interface TRequest {
  resolve: (payload: TResponse<any> | PromiseLike<TResponse<any>>) => void
  reject: (payload: Error) => void
  header: IRequestHeader
  payload: Record<string, any>
  returnError: boolean
  responseLength?: number
  start: number
  ttl?: number
}

export class WSClient {
  public bus: EventEmitter = new EventEmitter()
  public isConnectionOpen = new Ready()
  public isConnectionClosed = new Ready()
  protected isConnected = false
  protected isReconnect = false
  protected readonly debug: boolean = false
  protected readonly shouldReconnect: boolean = true
  protected readonly logger = loggerNamespace('WSClient')
  protected readonly wsUrl: string
  protected ws: WebSocket | null
  protected requests: Map<string, TRequest> = new Map()
  protected delayAttempt: number = 1000
  protected requestTimeoutMS: number

  /**
   */
  public constructor(wsUrl: string, reconnect: boolean = true, requestTimeoutMS: number = 60000, debug = false) {
    this.requestTimeoutMS = requestTimeoutMS
    this.shouldReconnect = reconnect
    this.debug = debug
    this.wsUrl = wsUrl
    this.ws = this.connect()
    this.dropRequests()
  }

  /**
   */
  public async call<T = Record<string, any>>(
    service: string,
    action: string,
    payload: Record<string, any> = {},
    returnError = false
  ): Promise<TResponse<T>> {
    const uuid = uuid4()
    const header = { uuid, service, action }
    const start = Date.now()
    this.send(header, payload).catch(this.logger.error)

    return new Promise((resolve, reject) => {
      const ttl = this.requestTimeoutMS ? start + this.requestTimeoutMS : undefined
      this.requests.set(uuid, { resolve, reject, header, payload, returnError, start, ttl })
    })
  }

  public async disconnect() {
    if (this.debug) {
      this.logger.debug('Connection terminating')
    }

    this.isConnected = false
    if (this.ws) {
      this.ws.close()
      if (this.ws.listenerCount('close') && !this.shouldReconnect) {
        if (this.debug) {
          this.logger.debug('Waiting for connection closing')
        }
        await this.isConnectionClosed.isReady()
      }
    }

    this.bus.emit(EVENT_TERMINATED)
  }

  /**
   */
  public on(event: string, handler: (payload: Record<string, any>) => void) {
    this.bus.on(event, handler)
    return () => this.bus.off(event, handler)
  }

  /**
   * FOR TESTING PURPOSE
   */
  public terminate() {
    if (this.ws) {
      this.ws.terminate()
    }
  }

  /**
   */
  protected async send(header: IRequestHeader, payload: Record<string, any> = {}) {
    const message = JSON.stringify({ header, payload })

    await this.isConnectionOpen.isReady()
    if (this.ws) {
      this.ws.send(message)
    }
  }

  /**
   */
  protected connect = (): WebSocket => {
    this.ws = new WebSocket(this.wsUrl)
    this.ws.addEventListener('error', this.handleError)
    this.ws.addEventListener('open', this.handleOpen)
    this.ws.addEventListener('close', this.handleClose)
    this.ws.addEventListener('message', this.handleMessage)
    return this.ws
  }

  /**
   */
  protected handleOpen = (event: Event) => {
    this.delayAttempt = 1000
    this.isConnected = true
    this.isConnectionClosed = new Ready()
    this.isConnectionOpen.resolve()
    this.bus.emit(EVENT_OPEN)
    if (this.isReconnect) {
      this.bus.emit(EVENT_RECONNECT)
    }
    this.delayAttempt = 0
  }

  /**
   */
  protected handleError = (event: ErrorEvent) => {
    this.logger.error(event)
    this.bus.emit(EVENT_ERROR, event)
    this.reconnect()
  }

  /**
   */
  protected handleClose = async (event: CloseEvent) => {
    if (this.debug) {
      this.logger.debug('Connection closing')
    }

    this.isConnected = false

    if (this.ws) {
      await this.waitForSocketState(this.ws, this.ws.CLOSED)
      if (this.debug) {
        this.logger.debug('Connection closed')
      }
    }

    this.bus.emit(EVENT_CLOSE)
    this.clearEvents()

    if (!this.shouldReconnect) {
      this.isConnectionClosed.resolve()
    }

    this.reconnect()
  }

  protected reconnect() {
    if (this.shouldReconnect) {
      this.logger.debug(`Connection reconnect in ${this.delayAttempt}ms`)
      this.isReconnect = true
      setTimeout(() => this.connect(), this.delayAttempt)
      if (this.delayAttempt < 10000) {
        this.delayAttempt += 3000
      }
    }
  }

  /**
   */
  protected handleMessage = (event: MessageEvent) => {
    try {
      if (typeof event.data !== 'string') {
        throw new Error('Unsupported data type')
      }

      const responseLength = event.data.length
      const data: TResponse<Record<string, any>> = JSON.parse(event.data) || {}
      if (data.header) {
        const { uuid } = data.header
        const payload = data.payload || {}
        let { status } = payload

        if (data.error) {
          status = 'error'
          payload.error = data.error
        }

        const error = ['error', 'fail'].includes(status) ? payload.error || 'System Error' : null

        const request = this.requests.get(uuid)
        const returnError = request && request.returnError

        if (error && !returnError) {
          if (request) {
            const { header } = request
            this.logger.error('WSClient.handleMessage error', {
              request: { header, payload: request.payload },
              response: { payload, header: data.header },
            })

            if (returnError && data.header.type === 'response') {
              this.resolveRequest(data).catch(this.logger.error)
            } else {
              request.reject(new Error(error))
            }

            this.requests.delete(uuid)
          }
        } else if (data.header.type === 'event') {
          const eventName = `${data.header.name}`
          this.processEventDebug(eventName, payload)
          setImmediate(() => this.bus.emit(eventName, payload))
        } else if (data.header.type === 'response' && request) {
          request.responseLength = responseLength
          this.processDebug(request)
          this.resolveRequest(data).catch(this.logger.error)
        }
      } else {
        this.logger.error('incorrect response', data)
      }
    } catch (error) {
      this.logger.error(error)
    }
  }

  /**
   */
  protected processDebug = (request: TRequest) => {
    if (this.debug) {
      const key = JSON.stringify(request.header)
      const time = Date.now() - request.start
      this.logger.info(key, `Time: ${time} ms, Length: ${Math.round((request.responseLength || 0) / 1024)} kb`)
    }
  }

  /**
   */
  protected processEventDebug = (event: string, payload: Record<string, any>) => {
    if (this.debug) {
      const data = JSON.stringify(payload)
      this.logger.info(event, data)
    }
  }

  /**
   */
  protected resolveRequest = async (data: Record<string, any>) => {
    const {
      payload = {},
      header: { uuid },
    } = data

    if (!payload.data) {
      payload.data = {}
    }

    const request = this.requests.get(uuid)

    if (request) {
      request.resolve(payload)
      this.requests.delete(uuid)
    }
  }

  /**
   */
  protected clearEvents = () => {
    if (this.ws) {
      this.ws.removeEventListener('error', this.handleError)
      this.ws.removeEventListener('open', this.handleOpen)
      this.ws.removeEventListener('close', this.handleClose)
      this.ws.removeEventListener('message', this.handleMessage)
    }
  }

  protected dropRequests() {
    if (this.requestTimeoutMS) {
      setInterval(() => {
        for (const [uuid, request] of this.requests) {
          if (request.ttl && Date.now() >= request.ttl) {
            request.reject(new Error('Timeout'))
            this.requests.delete(uuid)
          }
        }
      }, 1000)
    }
  }

  protected waitForSocketState(socket: WebSocket, state: 0 | 1 | 2 | 3) {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (socket.readyState === state) {
          resolve(true)
        } else {
          this.waitForSocketState(socket, state).then(resolve).catch(reject)
        }
      }, 5)
    })
  }
}
