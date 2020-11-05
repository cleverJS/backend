import { Article } from './Article'
import { AbstractService, IAbstractDependenciesList } from '../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { ArticleResource } from './resource/ArticleResource'

export interface IDependenciesList extends IAbstractDependenciesList<Article> {
  resource: ArticleResource
}

export class ArticleService extends AbstractService<Article> {
  protected deps!: IDependenciesList

  public constructor(deps: IDependenciesList) {
    super(deps)
  }

  public findByAuthor(author: string): Promise<Article | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
    return this.deps.resource.findOne(condition)
  }
}
