import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import * as yup from 'yup'
import { AbstractObject } from '../../../core/AbstractObject'

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
