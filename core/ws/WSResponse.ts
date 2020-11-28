export enum EWSResponseType {
  response = 'response',
  event = 'event',
  error = 'error',
}

export interface IWSResponseHeader {
  type: EWSResponseType
  uuid?: string
  name?: string
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
    this.header = header || { uuid: '0', type: EWSResponseType.response }
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
   * @param uuid
   * @param payload
   * @param type
   */
  public static async create(
    payload: Promise<Record<string, any>>,
    type: EWSResponseType = EWSResponseType.event,
    uuid?: string
  ): Promise<WSResponse> {
    const response = new WSResponse()
    response.header.uuid = uuid
    response.header.type = type
    response.payload = await payload
    return response
  }
}
