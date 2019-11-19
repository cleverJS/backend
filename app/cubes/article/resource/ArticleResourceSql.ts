import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { AbstractObject } from '../../../../core/AbstractObject'
import { Article } from '../Article'
import { morphism } from 'morphism'

export class ArticleResourceSql extends AbstractDBResource<Article> {
  protected table = 'article'

  public static scheme = {
    id: 'id',
    title: 'title',
    author: 'Author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  protected map(data: AbstractObject): typeof ArticleResourceSql.scheme {
    return morphism(ArticleResourceSql.scheme, data) as any
  }
}
