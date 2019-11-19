import argon2 from 'argon2'
import crypto from 'crypto'
import jwt, { VerifyErrors, VerifyOptions } from 'jsonwebtoken'
import fs from 'fs-extra'
import { ISecurityConfig } from './config'
import { logger } from '../../../core/logger/logger'

interface ITokenInterface {
  id: string | number
  email: string
  ts: number
}

interface IUserData {
  id: string | number
  email: string
}

export class SecurityHelper {
  private config: ISecurityConfig
  private readonly key: string

  public constructor(config: ISecurityConfig) {
    this.key = fs.readFileSync(config.jwtToken.publicKey, 'utf8').replace(/(\r\n|\n|\r)/gm, '')
    this.config = config
  }

  public async cryptPassword(password: string) {
    let hash
    const salt = this.genRandomString(16)
    try {
      const bufferPassword = Buffer.from(password)
      const bufferSalt = Buffer.from(salt)
      hash = await argon2.hash(bufferPassword, {
        type: argon2.argon2id,
        salt: bufferSalt,
      })
    } catch (e) {
      logger.error(e)
    }

    return {
      hash,
      salt,
    }
  }

  public async verifyPassword(hash: string, password: string) {
    let result = false
    const bufferPassword = Buffer.from(password)
    try {
      result = await argon2.verify(hash, bufferPassword)
    } catch (e) {
      logger.error(e)
    }

    return result
  }

  public genRandomString(length: number) {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
  }

  public generateToken(userData: IUserData, expiration: string = '6h') {
    const key = fs.readFileSync(this.config.jwtToken.privateKey, 'utf8')
    const data: ITokenInterface = {
      id: userData.id,
      email: userData.email,
      ts: Date.now(),
    }

    return jwt.sign({ data }, key, { expiresIn: expiration, algorithm: this.config.jwtToken.algorithm })
  }

  public async verifyToken(token: string, options?: VerifyOptions): Promise<{ data: ITokenInterface; exp: number; iat: number } | null> {
    try {
      return await new Promise((resolve, reject) =>
        jwt.verify(token, this.key, options, (err: VerifyErrors, decoded: object | string) => {
          if (err) {
            reject(err)
            return
          }

          if (typeof decoded === 'object') {
            resolve(decoded as { data: ITokenInterface; exp: number; iat: number })
            return
          }
          reject(null)
          return
        })
      )
    } catch (e) {
      return null
    }
  }

  public static decodeToken(token: string): { data: ITokenInterface } | null {
    return jwt.decode(token) as { data: ITokenInterface } | null
  }
}
