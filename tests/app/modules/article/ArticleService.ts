import { Article } from './Article'
import { AbstractService } from '../../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../../core/db/Condition'

export class ArticleService extends AbstractService<Article> {
  public findByAuthor(author: string): Promise<Article | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
    return this.deps.resource.findOne(condition)
  }
}
