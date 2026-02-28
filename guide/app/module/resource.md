# Resource

```typescript
import { DBEntityResource } from '../../../../core/db/sql/DBEntityResource'
import { Article } from '../Article'

export class ArticleEntityResource extends DBEntityResource<Article> {
}
```

`DBEntityResource` is an Entity abstraction that accepts the `IDBResource` interface and `IEntityFactory` in its constructor, enabling it to function independently of any specific data store implementation.

Initialization example:

```typescript
import { Knex } from 'knex'
import { ConditionDbParser } from '../../../../core/db/sql/condition/ConditionDbParser'
import { DBKnexResource } from '../../../../core/db/sql/DBKnexResource'
import { EntityFactory } from '../../../../core/entity/EntityFactory'
import { Article } from '../Article'
import { ArticleEntityResource } from './ArticleEntityResource'

// DBKnexResource implements IDBResource and handles low-level SQL via Knex
const dbResource = new DBKnexResource(connection, ConditionDbParser.getInstance(), { table: 'article' })

// DBEntityResource wraps DBKnexResource and EntityFactory
const articleEntityResource = new ArticleEntityResource(dbResource, new EntityFactory(Article))
```
