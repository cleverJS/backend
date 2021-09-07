import { types } from 'util'
import { settings } from '../configs'
import { MSG_ACCESS_DENIED } from '../configs/messages'
import { IAppConnection } from '../types/WSConnection'
import { SecurityHelper } from '../modules/security/SecurityHelper'

export interface IProtectDependencies {}

export interface IJSendResponse {
  status: 'success' | 'error' | 'fail'
  data?: Record<string, any>
  message?: string
}

export abstract class AbstractController {
  protected readonly deps: IProtectDependencies

  protected constructor(deps: IProtectDependencies) {
    this.deps = deps
  }

  protected response(status: 'success' | 'fail' | 'error', data?: Record<string, any>, message?: string): IJSendResponse {
    return {
      status,
      data,
      message,
    }
  }

  protected responseSuccess(payload: Record<string, any>): IJSendResponse {
    return this.response('success', payload)
  }

  protected responseFail(payload: Record<string, any>): IJSendResponse {
    return this.response('fail', payload)
  }

  protected responseError(message: string, error?: Error | unknown): IJSendResponse {
    if (error) {
      let errorMessage = ''
      if (types.isNativeError(error)) {
        errorMessage = error.message
      }
      return this.response('error', { message: errorMessage }, message)
    }

    return this.response('error', undefined, message)
  }

  protected responseAccessDenied(): IJSendResponse {
    return this.responseError(MSG_ACCESS_DENIED)
  }

  protected async isAuthorized(connection: IAppConnection): Promise<boolean> {
    const { token } = connection.state

    let result = Promise.resolve(false)
    if (token) {
      result = AbstractController.verifyToken(token)
    }

    return result
  }

  private static async verifyToken(token: string): Promise<boolean> {
    let isAuthorized = false
    const verifiedToken = await SecurityHelper.verifyToken(token, {
      algorithms: [settings.security.jwtToken.algorithm],
    })
    if (verifiedToken) {
      isAuthorized = true
    }

    return isAuthorized
  }
}
