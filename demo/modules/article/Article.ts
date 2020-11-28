import { AbstractEntity } from '../../../core/entity/AbstractEntity'

export type TArticle = {
  id: number
  title: string
  author: string
  content: string
  isPublished: boolean
}

export class Article extends AbstractEntity<TArticle> implements TArticle {
  public id: number = 0
  public title: string = ''
  public author: string = ''
  public content: string = ''
  public isPublished: boolean = false
}
