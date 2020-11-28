import { AbstractService } from '../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { Article } from './Article'

export class ArticleService extends AbstractService<Article> {
  public findByAuthor(author: string): Promise<Article | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
    return this.deps.resource.findOne(condition)
  }

  public getAuthorList(itemsPerPage: number): string[] {
    return ['G. M. Fikhtengolts', 'L. Euler', 'J. L. Lagrange'].slice(0, itemsPerPage)
  }

  public replaceAuthor(text: string, author: string): string {
    return text.replace('{{author}}', author)
  }
}
