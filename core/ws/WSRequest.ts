export interface IWSRequestHeader {
  uuid: string | number
  service: string
  action: string
}

export interface IWSRequest {
  header: IWSRequestHeader
  payload: Record<string, any>
}

export class WSRequest implements IWSRequest {
  public readonly header: IWSRequestHeader = { uuid: '', service: '', action: '' }
  public readonly payload: Record<string, any> = {}

  /**
   * @param requestObj
   */
  public constructor(requestObj: IWSRequest) {
    this.header = requestObj.header
    this.payload = requestObj.payload
  }

  public static requestStructure(): string {
    return '{ header: { uuid: string | number; service: string; action: string }, payload: Record<string, any> }'
  }
}
