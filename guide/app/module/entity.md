# Entity
An object that is not defined by its attributes,
but rather by a thread of continuity and its [identity](https://en.wikipedia.org/wiki/Identity_(object-oriented_programming)).

```typescript
import { number, object, string } from 'yup'
import { AbstractEntity } from '../../../core/entity/AbstractEntity'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable(true).default(null),
    title: string().defined().default(''),
    author: string().defined().default(''),
    content: string().defined().default(''),
  })

type TArticle = yup.InferType<typeof scheme>

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public id: number | null = null
  public title = ''
  public author = ''
  public content = ''

  public static cast(data: unknown): TArticle {
    return scheme.noUnknown().cast(data)
  }
}
```

Method cast is used for making sure that all raw data is valid and there is no unexpected fields
on return.

Pay attention that it could return TypeError exception in case of unconvertable data
