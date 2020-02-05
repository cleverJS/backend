# Entity
An object that is not defined by its attributes,
but rather by a thread of continuity and its [identity](https://en.wikipedia.org/wiki/Identity_(object-oriented_programming)).

```typescript
import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import { AbstractObject } from '../../../core/AbstractObject'
import * as yup from 'yup'

const scheme = yup.object().shape({
  id: yup.number(),
  title: yup.string(),
  author: yup.string(),
  content: yup.string(),
})

type TArticle = yup.InferType<typeof scheme>

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public title = ''
  public author = ''
  public content = ''

  public static cast(data: AbstractObject): TArticle {
    return scheme.noUnknown().cast(data)
  }
}
```

Method cast is used for making sure that all raw data is valid and there is no unexpected fields
on return.

Pay attention that it could return TypeError exception in case of unconvertable data
