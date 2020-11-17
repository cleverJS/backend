import { Article } from '../Article'
import { AbstractDBResource } from '../../../../../core/db/sql/AbstractDBResource'

export class ArticleResource extends AbstractDBResource<Article> {
  protected table = 'article'
}
