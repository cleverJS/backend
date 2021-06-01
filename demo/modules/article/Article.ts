import { AbstractEntity } from '../../../core/entity/AbstractEntity'

export type TArticle = {
  id: number | null
  title: string
  author: string
  content: string
  isPublished: boolean
}

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public id: number | null = null
  public title = ''
  public author = ''
  public content = ''
  public isPublished = false
}
