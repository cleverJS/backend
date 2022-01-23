export interface IWSRequestHeader {
  uuid: string | number
  service: string
  action: string
}

export interface IWSRequest<T = Record<string, any>> {
  header: IWSRequestHeader
  payload: T
}

export class WSRequest<T = Record<string, any>> implements IWSRequest<T> {
  public readonly header: IWSRequestHeader = { uuid: '', service: '', action: '' }
  public readonly payload: T = {} as T

  /**
   * @param requestObj
   */
  public constructor(requestObj: IWSRequest<T>) {
    this.header = requestObj.header
    this.payload = requestObj.payload
  }

  public static requestStructure(): string {
    return '{ header: { uuid: string | number; service: string; action: string }, payload: Record<string, any> }'
  }
}
