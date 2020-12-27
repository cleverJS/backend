import { AuthToken } from './AuthToken'
import { AuthTokenResource, AuthTokenResourceColumns } from './resource/AuthTokenResource'
import { AbstractService } from '../../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../../core/db/Condition'

export class AuthTokenService extends AbstractService<AuthToken, AuthTokenResource> {
  public findByUserId(userId: number): Promise<AuthToken | null> {
    const { userIdColumn, idColumn } = AuthTokenResourceColumns
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: userIdColumn, value: userId }] })
    condition.setSort(idColumn, 'desc')
    return this.resource.findOne(condition)
  }

  public findByToken(token: string): Promise<AuthToken | null> {
    const { tokenColumn } = AuthTokenResourceColumns
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: tokenColumn, value: token }] })
    return this.resource.findOne(condition)
  }

  public cleanUserToken(id: number): Promise<boolean> {
    const { userIdColumn } = AuthTokenResourceColumns
    return this.deleteAll(new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: userIdColumn, value: id }] }))
  }
}
