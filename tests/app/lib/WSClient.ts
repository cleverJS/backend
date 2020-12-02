import WebSocket from 'ws'
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
  type?: ResponseType
}

interface TResponse {
  header: IResponseHeader
  payload: Record<string, any>
  error?: string
}

interface TRequest {
  resolve: (value: TResponse) => void
  reject: (payload: Error) => void
  header: IRequestHeader
  payload: Record<string, any>
  returnError: boolean
  responseLength?: number
  start: number
}

interface TResponse {
  status: 'success' | 'error' | 'fail'
  data: Record<string, any>
}

export class WSClient {
  public bus: EventEmitter = new EventEmitter()
  public isConnected = false
  public isReconnect = false
  public ready = new Ready()
  protected readonly debug: boolean = false
  protected readonly reconnect: boolean = true
  protected readonly logger = loggerNamespace('WSClient')
  protected readonly wsUrl: string
  protected ws: WebSocket | null
  protected requests: { [key: string]: TRequest } = {}
  protected delayAttempt: number = 1000

  /**
   */
  public constructor(wsUrl: string, reconnect: boolean = true, debug = false) {
    this.reconnect = reconnect
    this.debug = debug
    this.wsUrl = wsUrl
    this.ws = this.connect()
  }

  /**
   */
  public call(service: string, action: string, payload: Record<string, any> = {}, returnError = false): Promise<Record<string, any>> {
    const uuid = uuid4()
    const header = { uuid, service, action }
    const start = Date.now()
    this.send(header, payload)
    return new Promise((resolve, reject) => {
      this.requests[uuid] = { resolve, reject, header, payload, returnError, start }
    })
  }

  public disconnect() {
    this.isConnected = false
    this.bus.emit(EVENT_TERMINATED)
    this.clearSubscription()
    if (this.ws) {
      this.ws.terminate()
      this.ws = null
    }
  }

  /**
   */
  public on(event: string, handler: (payload: Record<string, any>) => void) {
    this.bus.on(event, handler)
    return () => this.bus.off(event, handler)
  }

  /**
   */
  private send(header: IRequestHeader, payload: Record<string, any> = {}) {
    const message = JSON.stringify({ header, payload })

    this.ready.promise
      .then(() => {
        if (this.ws) {
          this.ws.send(message)
        }
      })
      .catch(this.logger.error)
  }

  /**
   */
  private connect = (): WebSocket => {
    this.ws = new WebSocket(this.wsUrl)
    this.ws.on('error', this.handleError)
    this.ws.on('open', this.handleOpen)
    this.ws.on('close', this.handleClose)
    this.ws.on('message', this.handleMessage)
    return this.ws
  }

  /**
   */
  private handleOpen = () => {
    this.logger.info('open')
    this.isConnected = true
    this.ready.resolve()
    this.bus.emit(EVENT_OPEN)
    if (this.isReconnect) {
      this.bus.emit(EVENT_RECONNECT)
    }
    this.delayAttempt = 0
  }

  /**
   */
  private handleError = (e: any) => {
    this.logger.error(e)
    this.bus.emit(EVENT_ERROR, e)
  }

  /**
   */
  private handleClose = () => {
    this.logger.warn('close')
    this.isConnected = false
    this.bus.emit(EVENT_CLOSE)
    this.clearSubscription()
    if (this.ws) {
      this.ws.terminate()
      this.ws = null
    }

    if (this.reconnect) {
      this.logger.info('reconnect')
      if (this.delayAttempt) {
        this.isReconnect = true
        setTimeout(() => this.connect(), this.delayAttempt)
      } else {
        this.delayAttempt = 1000
        this.connect()
      }
    }
  }

  /**
   */
  private handleMessage = (message: string) => {
    try {
      const responseLength = message.length
      const data: TResponse = JSON.parse(message) || {}
      if (data.header) {
        const { uuid } = data.header
        const payload = data.payload || {}
        let { status } = payload

        if (data.error) {
          status = 'error'
          payload.message = data.error
        }

        const error = ['error', 'fail'].includes(status) ? payload.message || 'System Error' : null

        const request = this.requests[uuid]
        const returnError = request && request.returnError

        if (error && !returnError) {
          const { header } = request
          this.logger.error('error', {
            request: { header, payload: request.payload },
            response: { payload, header: data.header },
          })

          if (request) {
            if (returnError && data.header.type === 'response') {
              this.resolveRequest(data).catch(this.logger.error)
            } else {
              request.reject(new Error(error))
            }

            delete this.requests[uuid]
          }
        } else if (data.header.type === 'event') {
          const eventName = `${data.header.service}:${data.header.action}`
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
  private processDebug = (request: TRequest) => {
    if (this.debug) {
      const key = JSON.stringify(request.header)
      const time = Date.now() - request.start
      this.logger.info(key, `Time: ${time} ms, Length: ${Math.round((request.responseLength || 0) / 1024)} kb`)
    }
  }

  /**
   */
  private resolveRequest = async (data: Record<string, any>) => {
    const {
      payload = {},
      header: { uuid },
    } = data
    if (!payload.data) {
      payload.data = {}
    }
    this.requests[uuid].resolve(payload)
    delete this.requests[uuid]
  }

  /**
   */
  private clearSubscription = () => {
    if (this.ws) {
      this.ws.off('error', this.handleError)
      this.ws.off('open', this.handleOpen)
      this.ws.off('close', this.handleClose)
      this.ws.off('message', this.handleMessage)
    }
  }
}
