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

type TArticle = {
  id: number | null
  title: string
  author: string
  content: string
}

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public id: number | null = null
  public title = ''
  public author = ''
  public content = ''
}

// Cast function must return a Promise — used by EntityFactory
export const castArticle = (data: unknown): Promise<TArticle> => {
  return scheme.noUnknown().validate(data)
}
```

The cast function is used for making sure that all raw data is valid and there is no unexpected fields
on return. It is passed to `EntityFactory` as the second argument:

```typescript
import { EntityFactory } from '../../../core/entity/EntityFactory'

const factory = new EntityFactory(Article, castArticle)
const item = await factory.create({ title: 'hello', author: 'test', content: '' })
```

Pay attention that `validate()` returns a Promise that may reject with a TypeError in case of unconvertable data.
