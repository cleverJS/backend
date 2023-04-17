import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { Article } from '../Article'

export class ArticleResource extends AbstractDBResource<Article> {
  protected table = 'article'

  // Completely Knex request
  public findWithAuthor(): Promise<any> {
    return this.connection({ t: this.table }).leftJoin({ a: 'author' }, 't.authorId', 'a.id').where('id', '=', 1).select('t.*', 'a.name')
  }

  // Knex request with partial raw SQL expressions
  public findWithAuthorPartialRaw(): Promise<any> {
    return this.connection({ t: this.table }).joinRaw('left join author a on t.authorId = a.id').where('id', '=', 1).select('t.*', 'a.name')
  }

  // Knex request with completely raw SQL expressions
  public findWithAuthorRaw(): Promise<any> {
    const query = `
      SELECT t.*, a.name FROM ${this.table}
      LEFT JOIN author a ON t.authorId = a.id
      WHERE id = 1;
    `
    return this.connection.raw(query)
  }

  public mapToDB(item: Article): any {
    if (!item.created) {
      const currentDate = new Date()
      currentDate.setMilliseconds(0)
      item.created = currentDate
    }

    const data = super.mapToDB(item)
    data.created = data.created.toISOString()

    if (data.from) {
      data.from = data.from.toISOString()
    }

    if (data.to) {
      data.to = data.to.toISOString()
    }

    return data
  }

  public map(data: Record<string, any>): any {
    data = super.map(data)

    if (data.created) {
      data.created = new Date(data.created)
    }

    if (data.from) {
      data.from = new Date(data.from)
    }

    if (data.to) {
      data.to = new Date(data.to)
    }

    return data
  }
}
