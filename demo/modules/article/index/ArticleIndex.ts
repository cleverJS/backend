import { IndicesCreate } from '@elastic/elasticsearch/api/requestParams'
import { ApiResponse } from '@elastic/elasticsearch'
import { AbstractElasticIndex } from '../../../../core/db/elasticsearch/AbstractElasticIndex'

export interface ArticleIndexData {
  id: string | null
  title: string
  author: string
  content: string
  isPublished: boolean
}

export class ArticleIndex extends AbstractElasticIndex {
  protected alias = 'alias-article'

  protected convertDocumentsToEntity(documents: ApiResponse): ArticleIndexData[] {
    const items: any = []
    for (let i = 0; i < documents.body.hits.hits.length; i++) {
      const hit = documents.body.hits.hits[i]
      const source = hit['_source']
      const id = hit._id
      const { ...data } = source
      items.push({ ...data, id })
    }

    return items
  }

  protected createIndexParams(index: string): IndicesCreate {
    return {
      index,
      body: {
        mappings: {
          properties: {
            title: { type: 'text' },
            author: { type: 'text' },
            content: { type: 'text' },
            isPublished: { type: 'boolean' },
          },
        },
      },
    }
  }
}
