import { AbstractEntity } from '../../../core/entity/AbstractEntity'

export type TArticle = {
  id: number
  title: string
  author: string
  content: string
  isPublished: boolean
}

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public id = 0
  public title = ''
  public author = ''
  public content = ''
  public isPublished = false
}
