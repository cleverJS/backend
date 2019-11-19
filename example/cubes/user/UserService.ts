import { User } from './User'
import { AbstractResource } from '../../../core/db/AbstractResource'
import { Condition } from '../../../core/db/Condition'
import { AbstractService, IAbstractDependenciesList } from '../../../core/AbstractService'

export interface IDependenciesList extends IAbstractDependenciesList {
  resource: AbstractResource<User>
}

export class UserService extends AbstractService {
  protected deps!: IDependenciesList

  constructor(deps: IDependenciesList) {
    super(deps)
  }

  public async findByToken(token: string) {
    const condition = new Condition([{ operator: Condition.EQUALS, field: 'token', value: token }])
    return this.deps.resource.findOne(condition)
  }
}
