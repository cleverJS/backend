import { FastifyReply, FastifyRequest } from 'fastify'
import { ServerResponse } from 'http'
import { HttpServer } from '../../../../core/http/HttpServer'
import { SecurityHelper } from '../../security/SecurityHelper'
import { WSRequest } from '../../../../core/ws/WSRequest'

export interface IProtectDependencies {
  securityHelper: SecurityHelper
  http: HttpServer
}

export abstract class AbstractProtectController {
  protected readonly deps: IProtectDependencies

  protected constructor(deps: IProtectDependencies) {
    this.deps = deps
  }

  protected preHTTPValidation = async (request: FastifyRequest, response: FastifyReply<ServerResponse>) => {
    const token = this.getTokenFromHeader(request)
    const isAuthorized = await this.isAuthorized(token)

    if (!isAuthorized) {
      response.code(401).send({ error: 'Not Authorized' })
    }
  }

  protected preWSValidation = async (request: WSRequest) => {
    const token = request.header.token

    if (!token) {
      return {
        status: 'fail',
        message: 'Token Required',
      }
    } else {
      const isAuthorized = await this.isAuthorized(token)
      if (!isAuthorized) {
        return {
          status: 'fail',
          message: 'Not Authorized',
        }
      }
    }

    return {
      status: 'success',
    }
  }

  private async isAuthorized(token: string) {
    let isAuthorized = false
    const verifiedToken = await this.deps.securityHelper.verifyToken(token)
    if (verifiedToken) {
      isAuthorized = true
    }

    return isAuthorized
  }

  private getTokenFromHeader(request: FastifyRequest) {
    let token
    if (request.headers.authorization) {
      token = request.headers.authorization.split(' ')[1]
    }

    return token
  }
}
