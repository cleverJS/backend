import { IWSRequest } from './WSRequest'

const types = ['response', 'event', 'error'] as ['response', 'event', 'error']
type ResponseType = typeof types[number]

export interface IWSResponseHeader {
  uuid?: string
  service: string
  action: string
  type: ResponseType
}

export interface IWSResponse {
  header: IWSResponseHeader
  payload: Record<string, any>
}

export class WSResponse implements IWSResponse {
  public readonly header: IWSResponseHeader
  public payload = {}
  public error: string = ''

  /**
   * @param header
   * @param payload
   */
  public constructor(header?: IWSResponseHeader, payload?: Record<string, any>) {
    this.header = header || { service: '', action: '', type: 'response' }
    this.payload = payload || {}
  }

  /**
   */
  public toString(): string {
    const result: any = {
      header: this.header,
      payload: this.payload,
    }

    if (this.error) {
      result.error = this.error
    }

    return JSON.stringify(result)
  }

  /**
   * @param request
   * @param type
   */
  public static fromRequest(request: IWSRequest, type: ResponseType = 'response'): WSResponse {
    const response = new WSResponse()
    response.header.uuid = request.header.uuid
    response.header.service = request.header.service
    response.header.action = request.header.action
    response.header.type = type
    return response
  }
}
