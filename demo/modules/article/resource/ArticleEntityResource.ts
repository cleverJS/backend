import { DBEntityResource } from '../../../../core/db/sql/DBEntityResource'
import { Article } from '../Article'

export class ArticleEntityResource extends DBEntityResource<Article> {
  // Completely Knex request
  public findWithAuthor(): Promise<any> {
    const sql = `select t.*, a.name from ${this.resource.getTable()} t1 left join author t2 on t2.id = t1.authorId where t.id = :id`
    return this.resource.query(sql, { id: 1 })
  }

  public async mapToDB(item: Article) {
    if (!item.created) {
      const currentDate = new Date()
      currentDate.setMilliseconds(0)
      item.created = currentDate
    }

    const data = await super.mapToDB(item)
    data.created = data.created.toISOString()

    if (data.from) {
      data.from = data.from.toISOString()
    }

    if (data.to) {
      data.to = data.to.toISOString()
    }

    return data
  }

  public async map(data: Record<string, any>) {
    data = await super.map(data)

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
