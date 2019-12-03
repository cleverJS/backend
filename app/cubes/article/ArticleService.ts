import { AbstractResource } from '../../../core/db/AbstractResource'
import { Article } from './Article'
import { AbstractService, IAbstractDependenciesList } from '../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../core/db/Condition'

export interface IDependenciesList extends IAbstractDependenciesList<Article> {
  resource: AbstractResource<Article>
}

export class ArticleService extends AbstractService<Article> {
  protected deps!: IDependenciesList

  constructor(deps: IDependenciesList) {
    super(deps)
  }

  public async findByAuthor(author: string) {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
    return await this.deps.resource.findOne(condition)
  }
}
