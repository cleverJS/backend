# Complicated DB query

[back](../../wizard.md)

If you need to execute a complicated request on DB, you may do it in Resource class
with the help of [Knex](https://github.com/knex/knex) package, or your own.

Example:

```ts
import { AbstractDBResource } from 'cleverJS/core/db/sql/AbstractDBResource'
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
}
```

Read [Knex](http://knexjs.org) documentation to get more about requests.

[back](../../wizard.md)
