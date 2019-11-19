import { AbstractMongoResource } from '../../../../core/db/mongo/AbstractMongoResource'
import { AbstractObject } from '../../../../core/AbstractObject'
import { IUserData, User } from '../User'

export class UserResourceMongo extends AbstractMongoResource<User> {
  protected collectionName = 'user'

  protected map(data: AbstractObject): IUserData {
    const id = data._id.toHexString()
    return {
      id,
      password: data.password,
      salt: data.salt,
      token: data.token,
      email: data.email,
      name: data.email,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  }
}
