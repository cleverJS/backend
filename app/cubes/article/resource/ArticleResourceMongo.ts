import { AbstractMongoResource } from '../../../../core/db/mongo/AbstractMongoResource'
import { Article, IArticleData } from '../Article'
import { AbstractObject } from '../../../../core/AbstractObject'
import { morphism } from 'morphism'
import { ObjectId } from 'mongodb'

export class ArticleResourceMongo extends AbstractMongoResource<Article> {
  protected collectionName = 'article'

  public static scheme = {
    id: {
      path: '_id',
      fn: (value: ObjectId) => {
        return value.toHexString()
      },
    },
    title: 'title',
    author: 'author',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  protected map(data: AbstractObject): IArticleData {
    return morphism(ArticleResourceMongo.scheme, data) as any
  }
}
