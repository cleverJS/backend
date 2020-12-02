import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { Article } from '../Article'

export class ArticleResource extends AbstractDBResource<Article> {
  protected table = 'article'

  public findSpecial() {
    return []
  }
}
