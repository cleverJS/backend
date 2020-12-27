import { AuthToken } from '../AuthToken'
import { AbstractDBResource } from '../../../../../core/db/sql/AbstractDBResource'

export enum AuthTokenResourceColumns {
  idColumn = 'id',
  userIdColumn = 'userId',
  tokenColumn = 'token',
  refreshTokenColumn = 'refreshToken',
  ttlColumn = 'ttl',
  createdAtColumn = 'createdAt',
  updatedAtColumn = 'updatedAt',
}

export class AuthTokenResource extends AbstractDBResource<AuthToken> {
  protected table = 'auth_token'
}
