import * as yup from 'yup'

export interface IWSRequestHeader {
  uuid?: string
  service: string
  action: string
  token?: string
}

export interface IWSRequest {
  header: IWSRequestHeader
  payload: Record<string, any>
}

export class WSRequest implements IWSRequest {
  public readonly header: IWSRequestHeader = { service: '', action: '' }
  public readonly payload: Record<string, any> = {}

  /**
   * @param requestObj
   */
  public constructor(requestObj: IWSRequest) {
    WSRequest.validate(requestObj)
    this.header = requestObj.header
    this.payload = requestObj.payload
  }

  /**
   * @param messageObj
   */
  public static validate(messageObj: IWSRequest) {
    yup
      .object()
      .shape({
        header: yup
          .object()
          .shape({
            uuid: yup.string(),
            service: yup.string().required(),
            action: yup.string().required(),
          })
          .required(),
        payload: yup.object().required(),
      })
      .validateSync(messageObj)
  }
}
