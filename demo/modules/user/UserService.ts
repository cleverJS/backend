import { AbstractService } from '../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { SecurityHelper } from '../security/SecurityHelper'

import { castUser } from './helper'
import { UserResource, UserResourceColumns } from './resource/UserResource'
import { EUserRoles, User } from './User'

export class UserService extends AbstractService<User, UserResource> {
  public findByRestoreToken(token: string): Promise<User | null> {
    const { restoreTokenColumn } = UserResourceColumns
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: restoreTokenColumn, value: token }] })
    return this.findOne(condition)
  }

  public findByTelegramId(id: number): Promise<User | null> {
    return this.resource.findByTelegramId(id)
  }

  public async fetchOrCreateByTelegramId(telegramId: number, userName?: string): Promise<User> {
    let user = await this.findByTelegramId(telegramId)
    if (!user) {
      const login = userName || SecurityHelper.genRandomString(15)
      user = await this.create(login, SecurityHelper.genRandomString(15), '', '', {
        telegramId,
      })
    }

    return user
  }

  public findByGoogleId(id: string, email?: string): Promise<User | null> {
    return this.resource.findByGoogleId(id, email)
  }

  public async fetchOrCreateByGoogleId(googleId: string, email?: string): Promise<User> {
    let user = await this.findByGoogleId(googleId, email)
    if (!user) {
      const login = email || SecurityHelper.genRandomString(15)
      user = await this.create(login, SecurityHelper.genRandomString(15), '', '', {
        googleId,
      })
    } else if (!user.data?.googleId) {
      user.data.googleId = googleId
      await this.save(user)
    }

    return user
  }

  public findByEmail(login: string): Promise<User | null> {
    const { loginColumn } = UserResourceColumns
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: loginColumn, value: login }] })
    return this.findOne(condition)
  }

  public async create(login: string, password: string, firstName: string, lastName: string, data: Record<string, any> = {}): Promise<User> {
    let user = await this.findByEmail(login)
    if (user) {
      throw new Error('User already exists')
    }

    const { hash, salt } = await SecurityHelper.cryptPassword(password)
    if (!hash || !salt) {
      throw new Error('Was not able to hash password')
    }

    const entityFactory = new EntityFactory(User, castUser)

    const currentDate = new Date()
    user = await entityFactory.create({
      salt,
      login,
      firstName,
      lastName,
      data,
      uuid: SecurityHelper.genRandomString(15),
      role: EUserRoles.user,
      password: hash,
      active: true,
      createdAt: currentDate,
      updatedAt: currentDate,
    })

    const result = await this.save(user)

    if (!result) {
      throw new Error('User was not created')
    }

    return user
  }

  public async updateLastVisitByUserId(id: number): Promise<boolean> {
    const user = await this.findById(id)
    if (user) {
      return this.updateLastVisit(user)
    }

    return false
  }

  public updateLastVisit(user: User): Promise<boolean> {
    user.lastVisit = new Date()
    return this.resource.save(user)
  }
}
