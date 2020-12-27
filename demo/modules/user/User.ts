import { AbstractEntity } from '../../../core/entity/AbstractEntity'

export enum EUserRoles {
  admin,
  user,
}

export type TUser = {
  id: number | null
  password: string
  salt: string
  login: string
  uuid: string
  role: EUserRoles
  firstName: string | null
  lastName: string | null
  restoreToken: string | null
  active: boolean
  data: Record<string, any>
  lastVisit: Date | null
  createdAt: Date
  updatedAt: Date
}

export class User extends AbstractEntity<TUser> implements TUser {
  public id: number | null = null
  public password: string = ''
  public salt: string = ''
  public login: string = ''
  public uuid: string = ''
  public role: number = EUserRoles.user
  public firstName: string | null = null
  public lastName: string | null = null
  public restoreToken: string | null = null
  public active: boolean = false
  public data: Record<string, any> = {}
  public lastVisit: Date = new Date()
  public createdAt: Date = new Date()
  public updatedAt: Date = new Date()

  public getNonSecureData(): Omit<TUser, 'active' | 'role' | 'password' | 'salt' | 'createdAt' | 'updatedAt' | 'restoreToken' | 'uuid' | 'data'> {
    const { active, role, password, salt, createdAt, updatedAt, restoreToken, uuid, ...data } = this.getData()
    return data
  }
}
