import * as yup from 'yup'
import { AbstractObject } from '../AbstractObject'

export interface IWSRequestHeader {
  uuid?: string
  service: string
  action: string
  token?: string
}

export interface IWSRequest {
  header: IWSRequestHeader
  payload: Object
}

export class WSRequest implements IWSRequest {
  public readonly header: IWSRequestHeader = { service: '', action: '' }
  public readonly payload: AbstractObject = {}

  /**
   * @param requestObj
   */
  public constructor(requestObj: IWSRequest) {
    this.validate(requestObj)
    this.header = requestObj.header
    this.payload = requestObj.payload
  }

  /**
   * @param messageObj
   */
  private validate(messageObj: IWSRequest) {
    yup.object().shape({
      header: yup.object().shape({
        uuid: yup.string(),
        service: yup.string().required(),
        action: yup.string().required(),
      }).required(),
      payload: yup.object().required(),
    }).validateSync(messageObj)
  }
}
