import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import * as yup from 'yup'
import { AbstractObject } from '../../../core/AbstractObject'

const scheme = yup.object().shape({
  id: yup.number(),
  title: yup.string(),
  author: yup.string(),
})

type TArticle = yup.InferType<typeof scheme>

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public title = ''
  public author = ''

  public static cast(data: AbstractObject): TArticle {
    return scheme.noUnknown()
      .cast(data)
  }
}
