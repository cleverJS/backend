import { Client } from '@elastic/elasticsearch'
import { ApiResponse } from '@elastic/elasticsearch/lib/Transport'
import { UpdateByQuery, DeleteByQuery, Msearch, Update, Search } from '@elastic/elasticsearch/api/requestParams'
import { loggerNamespace } from '../../logger/logger'

export interface IndexData {
  id: string | null
}

export abstract class AbstractElasticIndex {
  protected readonly logger = loggerNamespace('AbstractElasticIndex')
  protected readonly client: Client
  protected abstract index: string
  protected readonly prefix: string = 'elastic'

  public constructor(client: Client) {
    this.client = client
  }

  public async create(recreate: boolean = true) {
    if (recreate) {
      await this.delete()
    }

    try {
      const responseExists = await this.client.indices.exists({ index: this.getIndex() })
      if (!responseExists || !responseExists.body) {
        const indexParams = this.createIndexParams()
        const response = await this.client.indices.create(indexParams)
        return response && response.statusCode === 200 && response.body['acknowledged']
      }
    } catch (e) {
      this.logger.error(e)
      throw e
    }

    return false
  }

  public async delete() {
    try {
      const responseExists = await this.client.indices.exists({ index: this.getIndex() })
      if (responseExists && responseExists.body) {
        const responseDelete = await this.client.indices.delete({ index: this.getIndex() })
        return responseDelete && responseDelete.statusCode === 200 && responseDelete.body['acknowledged']
      }
    } catch (e) {
      this.logger.error(e)
      throw e
    }

    return false
  }

  public async count(params?: Record<string, any>) {
    if (params) {
      params['index'] = this.getIndex()
    }

    try {
      const response = await this.client.count(params || { index: this.getIndex() })
      return response.body.count
    } catch (e) {
      this.logger.error(e)
    }

    return 0
  }

  public async save<T extends IndexData>(item: T): Promise<string | null> {
    const { id } = item
    let dbItem = null
    if (id) {
      dbItem = await this.fetchById<T>(id)
    }

    let result = null
    const { id: skipId, ...data } = item
    if (dbItem && dbItem.id) {
      const resultUpdate = await this.updateDocument(dbItem.id, data)

      if (resultUpdate) {
        result = dbItem.id
      }
    } else {
      result = await this.indexDocument(data)
    }

    return result
  }

  public async deleteDocumentsByQuery(query: DeleteByQuery) {
    const deleteQuery: DeleteByQuery = {
      ...query,
      index: this.getIndex(),
      refresh: true,
    }

    const response = await this.client.deleteByQuery(deleteQuery)

    return response && response.statusCode === 200 && response.body.deleted > 0
  }

  public async deleteDocument(id: string) {
    const response = await this.client.delete({
      id,
      index: this.getIndex(),
      refresh: true,
    })

    return response && response.statusCode === 200 && response.body.deleted > 0
  }

  /**
   *
   * @param body
   * @return {Promise<string|null>} id
   */
  public async indexDocument(body: Record<string, any>): Promise<string | null> {
    const response = await this.client.index({
      body,
      index: this.getIndex(),
      refresh: true,
    })

    let id = null
    if (response && response.statusCode === 201) {
      id = response.body._id
    }

    return id
  }

  public async updateDocumentByQuery(query: UpdateByQuery) {
    const updateQuery: UpdateByQuery = {
      ...query,
      index: this.getIndex(),
      refresh: true,
    }

    const response = await this.client.updateByQuery(updateQuery)

    return response && response.statusCode === 200 && response.body.updated > 0
  }

  public async updateDocument(id: string, data: Record<string, any>) {
    const params: Update = {
      id,
      body: {
        doc: data,
      },
      refresh: true,
      index: this.getIndex(),
    }
    const response = await this.client.update(params)

    return response && response.statusCode === 200 && response.body.updated > 0
  }

  /**
   *
   * @param dataset
   * @return {Promise<string[]>} ids
   */
  public async bulkIndexDocument(dataset: Record<string, any>[]): Promise<string[]> {
    const result = []

    const body = dataset.flatMap((doc) => [{ index: { _index: this.getIndex() } }, doc]) as any
    try {
      const { body: bulkResponse } = await this.client.bulk({
        body,
        refresh: true,
      })

      if (bulkResponse.errors) {
        const erroredDocuments: any[] = []
        // The items array has the same order of the dataset we just indexed.
        // The presence of the `error` key indicates that the operation
        // that we did for the document has failed.
        bulkResponse.items.forEach((action: any, i: number) => {
          const operation = Object.keys(action)[0]
          if (action[operation].error) {
            erroredDocuments.push({
              // If the status is 429 it means that you can retry the document,
              // otherwise it's very likely a mapping error, and you should
              // fix the document before to try it again.
              status: action[operation].status,
              error: action[operation].error,
              operation: body[i * 2],
              document: body[i * 2 + 1],
            })
          }
        })
        this.logger.error(erroredDocuments)
      }

      if (bulkResponse.items && bulkResponse.items.length) {
        for (const item of bulkResponse.items) {
          result.push(item.index['_id'])
        }
      }
    } catch (e) {
      this.logger.error(e)
    }

    return result
  }

  public searchDocumentById(id: string): Promise<ApiResponse> {
    const params = {
      index: this.getIndex(),
      body: {
        query: {
          terms: {
            _id: [id],
          },
        },
      },
    }
    return this.client.search(params)
  }

  public searchDocument(params: Search): Promise<ApiResponse> {
    params['index'] = this.getIndex()
    return this.client.search(params)
  }

  public async fetchById<T extends IndexData>(id: string): Promise<T | null> {
    const params = {
      id,
      index: this.getIndex(),
    }

    const { body } = await this.client.get(params)

    let result = null
    if (body && body['_id'] && body['_source']) {
      result = {
        id,
        ...body['_source'],
      }
    }

    return result
  }

  public async *searchDocumentBulk(params: Record<string, any>) {
    params['index'] = this.getIndex()
    params['scroll'] = '10s'

    let response = await this.client.search(params)

    while (true) {
      const sourceHits = response.body.hits.hits

      if (sourceHits.length === 0) {
        break
      }

      for (const hit of sourceHits) {
        yield hit
      }

      if (!response.body['_scroll_id']) {
        break
      }

      response = await this.client.scroll({
        scroll_id: response.body['_scroll_id'],
        scroll: params.scroll,
      })
    }
  }

  public multiSearch(dataset: Record<string, any>[]): Promise<ApiResponse | null> {
    const body = dataset.flatMap((doc) => [{ index: this.getIndex() }, doc]) as any

    const p: Msearch = {
      body,
    }

    if (body.length !== 0 && body.length % 2 === 0) {
      return this.client.msearch(p)
    }

    return Promise.resolve(null)
  }

  public getIndex(): string {
    return `${this.prefix}-${this.index}`
  }

  protected abstract createIndexParams(): any
}
