import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { User } from '../User'

export enum UserResourceColumns {
  idColumn = 'id',
  firstNameColumn = 'firstName',
  lastNameColumn = 'lastName',
  passwordColumn = 'password',
  saltColumn = 'salt',
  loginColumn = 'login',
  uuidColumn = 'uuid',
  roleColumn = 'role',
  activeColumn = 'active',
  restoreTokenColumn = 'restoreToken',
  lastVisitColumn = 'lastVisit',
  dataColumn = 'data',
  createdAtColumn = 'createdAt',
  updatedAtColumn = 'updatedAt',
}

export class UserResource extends AbstractDBResource<User> {
  protected table = 'user'

  public async findByTelegramId(id: number): Promise<User | null> {
    const query = this.connection(this.table).whereJsonPath(UserResourceColumns.dataColumn, '$.telegramId', '=', id)

    const rows = await query

    if (rows.length > 1) {
      throw new Error(`Found two identical telegram users ${id}`)
    }

    if (rows.length === 0) {
      return null
    }

    return this.createEntity(rows[0])
  }

  public async findByGoogleId(id: string, email?: string): Promise<User | null> {
    const { loginColumn } = UserResourceColumns

    const query = this.connection(this.table).whereJsonPath(UserResourceColumns.dataColumn, '$.googleId', '=', id)
    if (email) {
      query.orWhere(loginColumn, '=', email)
    }

    const rows = await query

    if (rows.length > 1) {
      throw new Error(`Found two identical google users ${id}`)
    }

    if (rows.length === 0) {
      return null
    }

    return this.createEntity(rows[0])
  }

  public async mapToDB(item: User) {
    const userData = await super.mapToDB(item)
    return {
      ...userData,
      data: JSON.stringify(userData.data || {}),
    }
  }
}
