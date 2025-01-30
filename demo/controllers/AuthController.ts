import { RouteHandlerMethod } from 'fastify'
import { types } from 'util'

import { HttpServer } from '../../core/http'
import { loggerNamespace } from '../../core/logger/logger'
import { WSRequest } from '../../core/ws/WSRequest'
import { WSServer } from '../../core/ws/WSServer'
import { MSG_ACCESS_DENIED, MSG_EXISTS } from '../configs/messages'
import { AuthService, ITelegramPayload } from '../modules/security/auth/AuthService'
import { UserService } from '../modules/user'
import { EUserRoles, User } from '../modules/user/User'
import { IAppConnectionInfo } from '../types/WSConnection'

import { AbstractController, IJSendResponse } from './AbstractController'
import { AuthControllerValidator } from './validators/AuthControllerValidator'
import { controllerValidator } from './validators/ControllerValidator'
import { EValidator } from './validators/enum/ValidatorNameList'

export class AuthController extends AbstractController {
  protected readonly logger = loggerNamespace('AuthController')
  protected http: HttpServer
  protected authService: AuthService
  protected userService: UserService

  public constructor(wsServer: WSServer, http: HttpServer, authService: AuthService, userService: UserService) {
    super(wsServer)
    this.http = http
    this.authService = authService
    this.userService = userService
    AuthControllerValidator.init()
    this.init()
  }

  /**
   * payload = {
   *   login: string
   *   password: string
   * }
   *
   * @param request
   * @param connection
   */
  public actionSingIn = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    const validatorResult = await controllerValidator.validate(EValidator.authControllerValidatorSingIn, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { login, password } = request.payload
    let user: User | null = null
    let accessToken: string
    let refreshToken: string
    try {
      const signInResult = await this.authService.signIn(login, password)
      if (!signInResult) {
        return this.responseError(MSG_ACCESS_DENIED)
      }

      user = signInResult.user
      accessToken = signInResult.accessToken
      refreshToken = signInResult.refreshToken
    } catch (e) {
      this.logger.error(e)
      return this.responseError(MSG_ACCESS_DENIED, e)
    }

    if (!user) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    this.setConnectionState(connection, accessToken, user)

    return this.responseSuccess({
      accessToken,
      refreshToken,
      user: user.getNonSecureData(),
    })
  }

  /**
   * payload = {
   *   auth_date: number
   *   hash: string
   *   id: number
   *   first_name?: string
   *   last_name?: string
   *   photo_url?: string
   *   username?: string
   * }
   *
   * @param request
   * @param connection
   */
  public actionTelegram = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    const validatorResult = await controllerValidator.validate(EValidator.authControllerValidatorTelegram, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    let user: User | null = null
    let accessToken: string
    let refreshToken: string
    try {
      const payload = request.payload as ITelegramPayload
      const signInResult = await this.authService.signInTelegram(payload, true)
      if (!signInResult) {
        return this.responseError(MSG_ACCESS_DENIED)
      }
      user = signInResult.user
      accessToken = signInResult.accessToken
      refreshToken = signInResult.refreshToken
    } catch (e) {
      this.logger.error(e)
      return this.responseError(MSG_ACCESS_DENIED, e)
    }

    if (!user) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    this.setConnectionState(connection, accessToken, user)

    return this.responseSuccess({
      accessToken,
      refreshToken,
      user: user.getNonSecureData(),
    })
  }

  /**
   * payload = {
   *   token: string
   * }
   *
   * @param request
   * @param connection
   */
  public actionSingInByToken = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    const validatorResult = await controllerValidator.validate(EValidator.authControllerValidatorSingInByToken, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { token } = request.payload
    let user: User | null = null

    try {
      if (token) {
        user = await this.authService.authByToken(token)
        if (!user) {
          return this.responseError(MSG_ACCESS_DENIED)
        }

        this.setConnectionState(connection, token, user)
      }
    } catch (e) {
      this.logger.error(e)
      return this.responseError(MSG_ACCESS_DENIED, e)
    }

    if (!user) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    return this.responseSuccess({
      user: user.getNonSecureData(),
    })
  }

  /**
   * payload = {
   *   email: string
   *   password: string
   * }
   *
   * @param request
   * @param connection
   */
  public actionRegistration = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    const validatorResult = await controllerValidator.validate(EValidator.authControllerValidatorRegistration, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { login, password } = request.payload
    let user: User | null = null
    let accessToken: string | null = null
    let refreshToken: string | null = null
    try {
      const result = await this.authService.registration(login, password)
      if (result) {
        user = result.user
        accessToken = result.accessToken
        refreshToken = result.refreshToken
        if (user && accessToken && refreshToken) {
          this.setConnectionState(connection, accessToken, user)
        }
      }
    } catch (e) {
      let msg = MSG_ACCESS_DENIED

      if (types.isNativeError(e) && e.message === 'User already exists') {
        msg = MSG_EXISTS
        this.logger.warn(e.message, login)
      } else {
        this.logger.error(e)
      }
      return this.responseError(msg, e)
    }

    if (!user || !accessToken || !refreshToken) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    return this.responseSuccess({
      accessToken,
      refreshToken,
      user: user.getNonSecureData(),
    })
  }

  /**
   * payload = {
   *   accessToken: string
   *   refreshTokenNew: string
   * }
   *
   * @param request
   * @param connection
   */
  public actionRefreshToken = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    const validatorResult = await controllerValidator.validate(EValidator.authControllerValidatorRefreshToken, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { accessToken, refreshToken } = request.payload
    let accessTokenNew: string | null = null
    let refreshTokenNew: string | null = null
    let user: User | null = null
    try {
      const result = await this.authService.refreshToken(accessToken, refreshToken)
      if (result) {
        user = result.user
        accessTokenNew = result.accessToken
        refreshTokenNew = result.refreshToken
      }
    } catch (e) {
      this.logger.error(e)
      return this.responseError(MSG_ACCESS_DENIED, e)
    }

    if (!accessTokenNew || !refreshTokenNew || !user) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    this.setConnectionState(connection, accessToken, user)

    return this.responseSuccess({
      user: user.getNonSecureData(),
      accessToken: accessTokenNew,
      refreshToken: refreshTokenNew,
    })
  }

  /**
   * payload = {
   *   email: string
   * }
   *
   * @param request
   */
  public actionForgot = async (request: WSRequest): Promise<IJSendResponse> => {
    const validatorResult = await controllerValidator.validate(EValidator.authControllerValidatorForgot, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { email } = request.payload

    this.authService.generateRestoreToken(email).catch(this.logger.error)

    return this.responseSuccess({})
  }

  /**
   * payload = {
   *   token: string
   *   password: string
   * }
   *
   * @param request
   * @param connection
   */
  public actionReset = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    const validatorResult = await controllerValidator.validate(EValidator.authControllerValidatorReset, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { token, password } = request.payload

    let user: User | null = null
    let accessToken: string | null = null
    let refreshToken: string | null = null

    try {
      const result = await this.authService.restoreByToken(token, password)
      if (result) {
        user = result.user
        accessToken = result.accessToken
        refreshToken = result.refreshToken
        if (user && accessToken && refreshToken) {
          this.setConnectionState(connection, accessToken, user)
        }
      }
    } catch (e) {
      this.logger.error(e)
      return this.responseError(MSG_ACCESS_DENIED, e)
    }

    if (!user || !accessToken || !refreshToken) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    return this.responseSuccess({
      accessToken,
      refreshToken,
      user: user.getNonSecureData(),
    })
  }

  public actionGoogleAuth: RouteHandlerMethod = async (request, response): Promise<void> => {
    return response.send()
  }

  public actionGoogle = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    let user: User | null = null
    let accessToken: string
    let refreshToken: string
    try {
      let token
      for (const key of Object.keys(request.payload)) {
        token = request.payload[key]?.id_token
        if (token) {
          break
        }
      }

      const signInResult = await this.authService.signInGoogle(token)
      if (!signInResult) {
        return this.responseError(MSG_ACCESS_DENIED)
      }

      user = signInResult.user
      accessToken = signInResult.accessToken
      refreshToken = signInResult.refreshToken
    } catch (e) {
      this.logger.error(e)
      return this.responseError(MSG_ACCESS_DENIED, e)
    }

    if (!user) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    this.setConnectionState(connection, accessToken, user)

    return this.responseSuccess({
      accessToken,
      refreshToken,
      user: user.getNonSecureData(),
    })
  }

  protected setConnectionState(connection: IAppConnectionInfo, token: string, user: User): void {
    const { id: userId, role: userRole } = user

    if (!userId) {
      throw new Error('User id should be defined')
    }
    connection.state.token = token
    connection.state.userId = userId

    if (userRole === EUserRoles.admin) {
      connection.state.permissions = {
        user: { read: true, write: true },
      }
    }

    if (user.role === EUserRoles.user) {
      connection.state.permissions = {
        user: { read: false, write: false },
      }
    }
  }

  protected init(): void {
    this.http.get('/google/auth', this.actionGoogleAuth)

    this.wsServer.onRequest('auth', 'google', this.actionGoogle)
    this.wsServer.onRequest('auth', 'telegram', this.actionTelegram)
    this.wsServer.onRequest('auth', 'signin', this.actionSingIn)
    this.wsServer.onRequest('auth', 'token', this.actionSingInByToken)
    this.wsServer.onRequest('auth', 'registration', this.actionRegistration)
    this.wsServer.onRequest('auth', 'refresh', this.actionRefreshToken)
    this.wsServer.onRequest('auth', 'forgot', this.actionForgot)
    this.wsServer.onRequest('auth', 'reset', this.actionReset)

    this.wsServer.onDisconnect(async (connectionInfo?: IAppConnectionInfo) => {
      if (connectionInfo && connectionInfo.state.userId) {
        this.userService.updateLastVisitByUserId(connectionInfo.state.userId).catch(this.logger.error)
      }
    })
  }
}
