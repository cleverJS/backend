import { JSONStringifySafe } from '../utils/common'

export class HttpError extends Error {
  public request
  public response
  public constructor(request: TRequestErrorParams, response: TResponseErrorParams) {
    super('')
    this.request = request
    this.response = response
  }

  public toString() {
    return JSONStringifySafe({
      request: this.request,
      response: this.response,
    })
  }
}

export type TRequestErrorParams = {
  method: string
  url: string
  payload: Record<string, any>
}

export type TResponseErrorParams = {
  status: number | null
  code: string
  data: Record<string, any>
  message: string
}
