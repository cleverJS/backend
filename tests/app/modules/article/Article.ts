import * as yup from 'yup'
import { AbstractEntity } from '../../../../core/entity/AbstractEntity'

const scheme = yup.object().required().shape({
  id: yup.number().defined(),
  title: yup.string(),
  author: yup.string(),
})

type TArticle = yup.InferType<typeof scheme>

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public id: number = 0
  public title: string = ''
  public author: string = ''

  public static cast(data: Record<string, any>): TArticle {
    return scheme.noUnknown().cast(data)
  }
}
