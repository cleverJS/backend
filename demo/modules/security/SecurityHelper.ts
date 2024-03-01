import bcrypt from 'bcrypt'
import crypto from 'crypto'
import * as fs from 'fs'
import jwt, { VerifyOptions } from 'jsonwebtoken'
import { v4 as uuidV4 } from 'uuid'

import { logger } from '../../../core/logger/logger'
import { settings } from '../../configs'

export interface ITokenInterface {
  data: {
    id: number
    login: string
    ts: number
  }
  exp: number
  iat: number
}

interface IUserData {
  id: string | number
  login: string
}

export class SecurityHelper {
  public static async cryptPassword(password: string): Promise<{ hash?: string; salt: string }> {
    let hash
    const salt = SecurityHelper.genRandomString(16)
    try {
      const bufferPassword = Buffer.from(password)
      hash = await bcrypt.hash(bufferPassword, salt)
    } catch (e) {
      logger.error(e)
    }

    return {
      hash,
      salt,
    }
  }

  public static async verifyPassword(hash: string, password: string): Promise<boolean> {
    let result = false
    const bufferPassword = Buffer.from(password)

    try {
      result = await bcrypt.compare(bufferPassword, hash)
    } catch (e) {
      logger.error(e)
    }

    return result
  }

  public static generateToken(userData: IUserData, expiration: string = '6h'): string {
    const key = Buffer.from(fs.readFileSync(settings.security.jwtToken.privateKey, 'utf8'))
    const data = {
      id: userData.id,
      login: userData.login,
      ts: Date.now(),
    }

    return jwt.sign({ data }, key, { expiresIn: expiration, algorithm: settings.security.jwtToken.algorithm, jwtid: uuidV4() })
  }

  public static async verifyToken(token: string, options?: VerifyOptions): Promise<ITokenInterface | null> {
    try {
      const key = fs.readFileSync(settings.security.jwtToken.publicKey, 'utf8')
      return await new Promise((resolve, reject) => {
        jwt.verify(token, key, options, (err, decoded?) => {
          if (err) {
            if (err.name === 'TokenExpiredError') {
              logger.info(`Token has expired ${token}`)
            } else {
              logger.error(err)
            }

            reject(err)
          } else if (typeof decoded === 'object') {
            resolve(decoded as ITokenInterface)
          } else {
            reject(null)
          }
        })
      })
    } catch (e) {
      return null
    }
  }

  public static genRandomString(length: number): string {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length)
  }

  public static decodeToken(token: string): ITokenInterface {
    return jwt.decode(token) as ITokenInterface
  }
}
