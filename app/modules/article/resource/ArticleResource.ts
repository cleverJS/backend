import { morphism } from 'morphism'
import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { Article } from '../Article'

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

  public map(data: Record<string, any>): typeof ArticleResource.scheme {
    return morphism(ArticleResource.scheme, data) as any
  }

  public mapToDB(item: Article): any {
    return morphism(ArticleResource.schemeToDB, item.getData())
  }
}
