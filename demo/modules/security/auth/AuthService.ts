import crypto from 'crypto'
import { OAuth2Client } from 'google-auth-library'
import TypedEmitter from 'typed-emitter'

import { logger } from '../../../../core/logger/logger'
import { settings } from '../../../configs'
import { MSG_INVALID_TOKEN } from '../../../configs/messages'
import { AppEvents } from '../../../types/Events'
import { User } from '../../user/User'
import { UserService } from '../../user/UserService'
import { SecurityHelper } from '../SecurityHelper'
import { AuthTokenService } from '../token/AuthTokenService'

export interface IProtectDependencies {
  userService: UserService
  authTokenService: AuthTokenService
  eventBus: TypedEmitter<AppEvents>
}

export class AuthService {
  protected deps: IProtectDependencies

  public constructor(deps: IProtectDependencies) {
    this.deps = deps
  }

  public validateTelegramHash(payload: Record<string, any>, checkExpiration: boolean = false): boolean {
    if (!process.env.TELEGRAM_BOT_API) {
      throw new Error('No Telegram Bot API key')
    }

    if (checkExpiration) {
      const expirationSeconds = 300
      const authDate = parseInt(payload.auth_date, 10)
      const currentTime = parseInt((+new Date() / 1000) as any, 10)
      const timeSinceAuthRequest = currentTime - authDate
      if (timeSinceAuthRequest > expirationSeconds) {
        return false
      }
    }

    const sorted = Object.keys(payload).sort()
    const mapped = sorted // Everything except hash must be mapped
      .filter((d) => d !== 'hash')
      .map((key) => `${key}=${payload[key]}`)

    const hashString = mapped.join('\n')

    const secretKey = crypto.createHash('sha256').update(process.env.TELEGRAM_BOT_API).digest()
    const hash = crypto.createHmac('sha256', secretKey).update(hashString).digest('hex')

    return hash === payload.hash
  }

  /**
   * Method for Sign In via Telegram (Login)
   * @param payload
   * @param checkExpiration
   *
   * @throws Error - 'User not found' or 'Incorrect Password'
   */
  public async signInTelegram(
    payload: ITelegramPayload,
    checkExpiration: boolean = false
  ): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const isValid = await this.validateTelegramHash(payload, checkExpiration)

    if (!isValid) {
      return null
    }

    const telegramId = parseInt(payload.id, 10)
    const user = await this.deps.userService.fetchOrCreateByTelegramId(telegramId, payload.username)

    const { id, login } = user

    if (!id) {
      return null
    }

    const { accessToken, refreshToken } = await this.fetchOrCreateAccessToken(id, login)

    return { user, accessToken, refreshToken }
  }

  public async signInGoogle(idToken: string): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const client = new OAuth2Client(process.env.GOOGLE_API_KEY)

    try {
      const ticket = await client.verifyIdToken({
        idToken,
      })

      const payload = ticket.getPayload()

      if (payload) {
        const { sub: googleId, email, email_verified: emailVerified } = payload

        if (emailVerified) {
          const user = await this.deps.userService.fetchOrCreateByGoogleId(googleId, email)

          const { id, login } = user

          if (!id) {
            return null
          }

          const { accessToken, refreshToken } = await this.fetchOrCreateAccessToken(id, login)

          return { user, accessToken, refreshToken }
        }
      }
    } catch (e) {
      logger.error(e)
    }

    throw new Error('Cannot authorize')
  }

  public async authByToken(token: string): Promise<User | null> {
    const tokenObject = await SecurityHelper.verifyToken(token, { algorithms: [settings.security.jwtToken.algorithm] })

    let user: User | null = null
    if (tokenObject?.data?.id) {
      const tokenItemPromise = this.deps.authTokenService.findByToken(token)
      const userPromise = await this.deps.userService.findById(tokenObject.data.id.toString())

      const [tokenItem, userItem] = await Promise.all([tokenItemPromise, userPromise])
      user = userItem

      if (tokenItem && userItem) {
        if (tokenItem.userId !== userItem.id) {
          throw new Error(MSG_INVALID_TOKEN)
        }
      } else {
        throw new Error(MSG_INVALID_TOKEN)
      }
    } else {
      throw new Error(MSG_INVALID_TOKEN)
    }

    return user
  }

  /**
   * Method for Sign In (Login)
   * @param email
   * @param passwordText
   *
   * @throws Error - 'User not found' or 'Incorrect Password'
   */
  public async signIn(email: string, passwordText: string): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const user = await this.deps.userService.findByEmail(email)
    if (!user) {
      return null
    }

    const { id, login, password, salt } = user

    if (!id) {
      return null
    }

    const isVerified = await SecurityHelper.verifyPassword(password, passwordText, salt)

    if (!isVerified) {
      return null
    }

    const { accessToken, refreshToken } = await this.fetchOrCreateAccessToken(id, login)

    return { user, accessToken, refreshToken }
  }

  public async refreshToken(accessToken: string, refreshToken: string): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const tokenObject = await SecurityHelper.verifyToken(refreshToken, { algorithms: [settings.security.jwtToken.algorithm] })

    if (tokenObject) {
      const tokenItem = await this.deps.authTokenService.findByToken(accessToken)

      if (tokenItem?.refreshToken === refreshToken) {
        const user = await this.deps.userService.findById(String(tokenItem.userId))
        if (user) {
          const { id, login } = user
          if (!id) {
            throw new Error('No id')
          }

          const token = await this.recordToken(id, login)
          if (tokenItem.id) {
            await this.deps.authTokenService.delete(String(tokenItem.id))
          }
          // TODO: reset connections ?

          return {
            user,
            accessToken: token.accessToken,
            refreshToken: token.refreshToken,
          }
        }
      }
    }

    return null
  }

  public async registration(email: string, password: string): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const user = await this.deps.userService.create(email, password, '', '')

    let result = null
    if (user) {
      result = await this.signIn(email, password)
      this.deps.eventBus.emit('registration', user)
    }

    return result
  }

  public async restoreByToken(token: string, newPassword: string): Promise<{ user: User; accessToken: string; refreshToken: string } | null> {
    const tokenObject = await SecurityHelper.verifyToken(token, { algorithms: [settings.security.jwtToken.algorithm] })

    if (tokenObject) {
      const user = await this.deps.userService.findByRestoreToken(token)

      if (!user) {
        throw new Error('User not found')
      }

      const { hash, salt } = await SecurityHelper.cryptPassword(newPassword)
      if (!hash || !salt) {
        throw new Error('Was not able to hash password')
      }

      user.salt = salt
      user.password = hash
      user.restoreToken = null

      if (!user.id) {
        throw new Error('No id')
      }

      const deleteAllPromise = this.deps.authTokenService.cleanUserToken(user.id)
      // TODO: reset connections ?
      const savePromise = this.deps.userService.save(user)
      await Promise.all([deleteAllPromise, savePromise])

      return this.signIn(user.login, newPassword)
    }

    return null
  }

  public async generateRestoreToken(email: string): Promise<boolean> {
    const user = await this.deps.userService.findByEmail(email)

    if (!user) {
      throw new Error('User not found')
    }

    if (!user.id) {
      throw new Error('No id')
    }

    user.restoreToken = await SecurityHelper.generateToken(
      {
        login: email,
        id: user.id,
      },
      '10m'
    )

    const result = await this.deps.userService.save(user)

    this.deps.eventBus.emit('password-restore', user)

    return result
  }

  protected async recordToken(userId: number, login: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessTokenPromise = SecurityHelper.generateToken(
      {
        login,
        id: userId,
      },
      '1y'
    )

    const refreshTokenPromise = SecurityHelper.generateToken(
      {
        login,
        id: userId,
      },
      '1.5y'
    )

    const [accessToken, refreshToken] = await Promise.all([accessTokenPromise, refreshTokenPromise])

    const decryptedRefreshToken = SecurityHelper.decodeToken(refreshToken)

    const ttl = new Date(decryptedRefreshToken.exp)
    const token = await this.deps.authTokenService.createEntity({
      ttl,
      refreshToken,
      userId,
      token: accessToken,
    })

    await this.deps.authTokenService.save(token).catch(logger.error)

    return {
      accessToken,
      refreshToken,
    }
  }

  protected async fetchOrCreateAccessToken(userId: number, login: string): Promise<{ accessToken: string; refreshToken: string }> {
    const accessTokenDB = await this.deps.authTokenService.findByUserId(userId)

    let token
    if (accessTokenDB) {
      const tokenObject = await SecurityHelper.verifyToken(accessTokenDB.token, { algorithms: [settings.security.jwtToken.algorithm] })
      if (tokenObject) {
        token = {
          accessToken: accessTokenDB.token,
          refreshToken: accessTokenDB.refreshToken,
        }
      }
    }

    if (!token) {
      token = await this.recordToken(userId, login)
    }

    const { accessToken, refreshToken } = token
    return { accessToken, refreshToken }
  }
}

export interface ITelegramPayload {
  auth_date: string
  hash: string
  id: string
  first_name?: string
  last_name?: string
  photo_url?: string
  username?: string
}
