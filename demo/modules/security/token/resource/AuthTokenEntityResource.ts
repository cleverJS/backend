import { DBEntityResource } from '../../../../../core/db/sql/DBEntityResource'
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

export class AuthTokenEntityResource extends DBEntityResource<AuthToken> {
}
