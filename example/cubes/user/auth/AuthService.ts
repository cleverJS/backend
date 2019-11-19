import { User } from '../User'
import { AbstractResource } from '../../../../core/db/AbstractResource'
import { Condition } from '../../../../core/db/Condition'
import { SecurityHelper } from '../../security/SecurityHelper'

export interface IProtectDependencies {
  repository: AbstractResource<User>
  securityHelper: SecurityHelper
}

export class AuthService {
  protected deps: IProtectDependencies

  public constructor(deps: IProtectDependencies) {
    this.deps = deps
  }

  /**
   * Method for Sign Up (Registration)
   * @param email
   * @param password
   *
   */
  public async signUp(email: string, password: string) {
    const cryptoPassword = await this.deps.securityHelper.cryptPassword(password)

    const user = this.deps.repository.createEntity({
      email,
      password: cryptoPassword.hash,
      salt: cryptoPassword.salt,
    })

    user.token = this.deps.securityHelper.generateToken(user)
    await this.deps.repository.save(user)

    return user.clearUser()
  }

  /**
   * Method for Sign In (Login)
   * @param email
   * @param password
   *
   * @throws Error - 'User not found' or 'Incorrect Password'
   */
  public async signIn(email: string, password: string) {
    const condition = new Condition([{ operator: Condition.EQUALS, field: 'email', value: email }])

    const user = await this.deps.repository.findOne(condition)
    if (!user) {
      throw new Error('User not found')
    } else {
      const correctPassword = await this.deps.securityHelper.verifyPassword(user.password, password)
      if (!correctPassword) {
        throw new Error('Incorrect password')
      }

      user.token = this.deps.securityHelper.generateToken(user)
      await this.deps.repository.save(user)
    }

    return user.clearUser()
  }
}
