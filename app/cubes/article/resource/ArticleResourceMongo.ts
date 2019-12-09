import { AbstractMongoResource } from '../../../../core/db/mongo/AbstractMongoResource'
import { Article } from '../Article'
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

  protected map(data: AbstractObject): typeof ArticleResourceMongo.scheme {
    return morphism(ArticleResourceMongo.scheme, data) as any
  }

  protected mapToDB(item: Article): any {
    return item.getData()
  }
}
