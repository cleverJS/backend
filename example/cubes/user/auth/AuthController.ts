import { ServerResponse } from 'http'
import { FastifyReply, FastifyRequest } from 'fastify'
import { UserService } from '../UserService'
import { AuthService } from './AuthService'
import { User } from '../User'
import { HttpServer } from '../../../../core/http/HttpServer'
import { AbstractEntity } from '../../../../core/entity/AbstractEntity'
import { logger } from '../../../../core/logger/logger'

interface IDependencies {
  userService: UserService
  authService: AuthService
  http: HttpServer
}

interface IRestResponse<T extends AbstractEntity> {
  result: 'success' | 'error'
  error?: {
    code: string
    message: string
  }
  data: T | null
}

export class AuthController {
  private readonly deps: IDependencies

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.init().catch(logger.error)
  }

  private async init() {
    const instance = this.deps.http.getServer()
    instance.post('/auth/signin', this.actionSingIn)
    instance.post('/auth/signup', this.actionSignUp)
  }

  /**
   * Action for sign in (Login)
   *
   * @typeparam FastifyRequest request
   * @typeparam FastifyReply<ServerResponse> response
   *
   * @returns IRestResponse<IUser>
   */
  private actionSingIn = async (request: FastifyRequest, response: FastifyReply<ServerResponse>) => {
    const { login, password } = request.body
    let user
    try {
      user = await this.deps.authService.signIn(login, password)
    } catch (e) {
      logger.info(e)
    }

    const payload: IRestResponse<User> = { result: 'success', data: user || null }
    response.send(payload)
  }

  /**
   * Action for sign up (Registration)
   *
   * @typeparam FastifyRequest request
   * @typeparam FastifyReply<ServerResponse> response
   *
   * @returns IRestResponse<IUser>
   */
  private actionSignUp = async (request: FastifyRequest, response: FastifyReply<ServerResponse>) => {
    const { login, password } = request.body
    let user
    try {
      user = await this.deps.authService.signUp(login, password)
    } catch (e) {
      logger.info(e)
    }
    const payload: IRestResponse<User> = { result: 'success', data: user || null }
    response.send(payload)
  }
}
