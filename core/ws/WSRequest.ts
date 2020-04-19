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
    this.header = requestObj.header
    this.payload = requestObj.payload
  }
}
