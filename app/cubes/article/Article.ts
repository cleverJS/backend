import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import * as yup from 'yup'
import { AbstractObject } from '../../../core/AbstractObject'

interface IArticleData extends AbstractObject {
  title: string
  author: string
}

export class Article extends AbstractEntity<IArticleData> implements IArticleData {
  public title = ''
  public author = ''

  public static cast(data: AbstractObject): IArticleData {
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
