# Resource

```typescript
import { DBEntityResource } from '../../../../core/db/sql/DBEntityResource'
import { Article } from '../Article'

export class ArticleEntityResource extends DBEntityResource<Article> {
}

```

DBEntityResource is an Entity abstraction that accept the Resource interface in constructor, enabling it to function independently of any specific data store implementation.
