import { AbstractDBResource } from '../../../../../core/db/sql/AbstractDBResource'
import { AuthToken } from '../AuthToken'

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
