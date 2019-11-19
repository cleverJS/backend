# Entity
An object that is not defined by its attributes,
but rather by a thread of continuity and its [identity](https://en.wikipedia.org/wiki/Identity_(object-oriented_programming)).

```typescript
import { AbstractEntity, IAbstractEntityData } from '../../../core/entity/AbstractEntity'
import * as yup from 'yup'

export interface IArticleData extends IAbstractEntityData {
  title: string
  author: string
}

export class Article extends AbstractEntity implements IArticleData {
  public title = ''
  public author = ''

  public getData(): IArticleData {
    const data: any = {}
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        data[key] = this[key]
      }
    }

    return Article.cast(data)
  }

  public static cast(data: IArticleData) {
    return yup
      .object()
      .shape({
        id: yup.string(),
        title: yup.string(),
        author: yup.string(),
      })
      .noUnknown()
      .cast(data)
  }
}
```

Method cast is used for making sure that all raw data is valid and there is no unexpected fields
on return.

Pay attention that it could return TypeError exception in case of unconvertable data
