import * as yup from 'yup'
import { IWSRequest } from './WSRequest'

const types = ['response', 'event', 'error'] as ['response', 'event', 'error']
type ResponseType = typeof types[number]

interface IWSResponseHeader {
  uuid?: string
  service: string
  action: string
  type: ResponseType
}

export interface IWSResponse {
  header: IWSResponseHeader
  payload: Object
}

export class WSResponse implements IWSResponse {
  public readonly header: IWSResponseHeader
  public payload = {}
  public error: string = ''

  /**
   * @param header
   * @param payload
   */
  public constructor(header?: IWSResponseHeader, payload?: Object) {
    this.header = header || { service: '', action: '', type: 'response' }
    this.payload = payload || {}
  }

  /**
   */
  public validate() {
    yup
      .object()
      .shape({
        header: yup
          .object()
          .shape({
            uuid: yup.string(),
            service: yup.string().required(),
            action: yup.string().required(),
            type: yup
              .string()
              .oneOf(types)
              .required(),
          })
          .required(),
        payload: yup.object().required(),
      })
      .validateSync(this)
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
