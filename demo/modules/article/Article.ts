import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import { currentDateFunction } from '../../utils/common'

export type TArticle = {
  id: number | null
  title: string
  author: string
  content: string | null
  created: Date | null
  isPublished: boolean
}

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public id: number | null = null
  public title = ''
  public author = ''
  public content: string | null = null
  public created: Date | null = currentDateFunction()
  public isPublished = false
}
