# Resource

```typescript
import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { AbstractObject } from '../../../../core/AbstractObject'
import { Article, IArticleData } from '../Article'
import { morphism } from 'morphism'

export class ArticleResourceSql extends AbstractDBResource<Article> {
  protected table = 'article'

  public static scheme = {
    id: 'id',
    title: 'title',
    author: 'author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  protected map(data: AbstractObject): IArticleData {
    return morphism(ArticleResourceSql.scheme, data) as any
  }
}
```

Method map is used for transformate keys and values of raw data from external source. 
