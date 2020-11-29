import { AbstractService } from '../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { Article } from './Article'
import { Paginator } from '../../../core/utils/Paginator'

export class ArticleService extends AbstractService<Article> {
  public findByAuthor(author: string): Promise<Article | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
    return this.deps.resource.findOne(condition)
  }

  public async fetchAuthorList(paginator: Readonly<Paginator>): Promise<string[]> {
    const items = await this.findAll(undefined, paginator)
    return items.map((i) => i.author)
  }

  public replaceAuthor(text: string, author: string): string {
    return text.replace('{{author}}', author)
  }
}
