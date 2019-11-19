import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import * as yup from 'yup'
import { AbstractObject } from '../../../core/AbstractObject'

export interface IUser {
  password: string
  salt: string
  token: string
  email: string
  name: string
  createdAt: string
  updatedAt: string
}

export class User extends AbstractEntity<IUser> implements IUser {
  public password = ''
  public salt = ''
  public token = ''
  public email = ''
  public name = ''
  public createdAt = ''
  public updatedAt = ''

  public clearUser() {
    const item = { ...this }
    delete item.password
    delete item.salt
    delete item.createdAt
    return item
  }

  public static cast(data: AbstractObject) {
    return yup
      .object()
      .shape({
        id: yup.string(),
        password: yup.string(),
        salt: yup.string(),
        token: yup.string(),
        email: yup.string(),
        name: yup.string(),
        createdAt: yup.string(),
        updatedAt: yup.string(),
      })
      .noUnknown()
      .cast(data)
  }
}
