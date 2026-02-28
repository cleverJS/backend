# Complicated DB query

[back](../../wizard.md)

If you need to execute a complicated request on DB, you may do it in the EntityResource class
with the help of [Knex](https://github.com/knex/knex) package, or your own.

The `DBEntityResource` has access to the underlying `DBKnexResource` via `this.resource`, which provides
`query()`, `getConnection()`, and `getTable()` methods for raw SQL access.

Example:

```ts
import { DBEntityResource } from '@cleverjs/backend/core/db/sql/DBEntityResource'
import { Article } from '../Article'

export class ArticleEntityResource extends DBEntityResource<Article> {
  // Completely raw SQL query via resource.query()
  public findWithAuthor(): Promise<any> {
    const sql = `select t.*, a.name from ${this.resource.getTable()} t left join author a on a.id = t.authorId where t.id = :id`
    return this.resource.query(sql, { id: 1 })
  }

  // Knex QueryBuilder via resource.getConnection()
  public findWithAuthorKnex(): Promise<any> {
    return this.resource.getConnection()({ t: this.resource.getTable() })
      .leftJoin({ a: 'author' }, 't.authorId', 'a.id')
      .where('t.id', '=', 1)
      .select('t.*', 'a.name')
  }

  // Knex request with partial raw SQL expressions
  public findWithAuthorPartialRaw(): Promise<any> {
    return this.resource.getConnection()({ t: this.resource.getTable() })
      .joinRaw('left join author a on t.authorId = a.id')
      .where('t.id', '=', 1)
      .select('t.*', 'a.name')
  }
}
```

Read [Knex](http://knexjs.org) documentation to get more about requests.

[back](../../wizard.md)
