import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { AbstractObject } from '../../../../core/AbstractObject'
import { Article } from '../Article'
import { morphism } from 'morphism'

export class ArticleResource extends AbstractDBResource<Article> {
  protected table = 'article'

  public static scheme = {
    id: 'id',
    title: 'title',
    author: 'Author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  public static schemeToDB = {
    id: 'id',
    title: 'title',
    author: 'Author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  public map(data: AbstractObject): typeof ArticleResource.scheme {
    return morphism(ArticleResource.scheme, data) as any
  }

  public mapToDB(item: Article): any {
    return morphism(ArticleResource.schemeToDB, item.getData())
  }
}
