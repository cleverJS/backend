import { AbstractService } from '../../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../../core/db/Condition'

import { AuthToken } from './AuthToken'
import { AuthTokenEntityResource, AuthTokenResourceColumns } from './resource/AuthTokenEntityResource'

export class AuthTokenService extends AbstractService<AuthToken, AuthTokenEntityResource> {
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
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: userIdColumn, value: id }] });
    return this.deleteAll(condition)
  }
}
