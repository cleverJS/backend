# Entity

[back](../wizard.md)

The easiest way to describe Entities is in the form of nouns: human, car, product, etc.

In development, Entity personality is determined by the presence of an identifier (id).

Entity example

```ts
import { AbstractEntity } from 'cleverJS/core/entity/AbstractEntity'

export type TArticle = {
  id: number | null
  title: string
  author: string
  content: string
  isPublished: boolean
}

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public id: number | null = null
  public title: string = ''
  public author: string = ''
  public content: string = ''
  public isPublished: boolean = false
}
```

We use it to be sure of data consistency which is necessary on data saving, handle by
business logic or passing to third party application.

Entity creation could be used with [yup](https://github.com/jquense/yup) validator for archiving this.

It could be done in the following way:

1. Create validator helper function `./app/modules/article/helper.ts`

```ts
import { boolean, number, object, string } from 'yup'
import { TArticle } from './Article'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable(true).default(null),
    title: string().defined().default(''),
    author: string().defined().default(''),
    content: string().defined().default(''),
    isPublished: boolean().defined().default(false),
  })

export const castArticle = (data: unknown): Promise<TArticle> => {
  return scheme.noUnknown().validate(data)
}
```

```ts
import { castArticle } from './helper'

const data = {
  'title': 'The Fundamentals of Mathematical Analysis I',
  'author': 'G. M. Fikhtengolts',
  'field': 'test',
}

const factory = new EntityFactory(Article, castArticle)
const entity = await factory.create(data)
```

However, [yup](https://github.com/jquense/yup) is optional, and it could be replaced with anything
or being abandoned.

The next step describes how Entity - Service - Resource are using together in a DB resource [abstraction](./8_abstraction.md)

[back](../wizard.md)
