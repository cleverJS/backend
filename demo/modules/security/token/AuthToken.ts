import { AbstractEntity } from '../../../../core/entity/AbstractEntity'

export type TAuthToken = {
  id: number | null
  userId: number
  token: string
  refreshToken: string
  ttl: Date | null
  createdAt: Date
  updatedAt: Date
}

export class AuthToken extends AbstractEntity<TAuthToken> implements TAuthToken {
  public id: number = 0
  public userId: number = 0
  public token: string = ''
  public refreshToken: string = ''
  public ttl: Date | null = null
  public createdAt: Date = new Date()
  public updatedAt: Date = new Date()
}
