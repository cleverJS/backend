import { Client } from '@elastic/elasticsearch'
import { ApiResponse } from '@elastic/elasticsearch/lib/Transport'
import { UpdateByQuery, DeleteByQuery, Msearch, Update, Search, Count, Delete, Index, Bulk } from '@elastic/elasticsearch/api/requestParams'
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

      this.logger.error('create index', JSON.stringify(responseExists))
    } catch (e) {
      this.logger.error('create index', e)
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
      this.logger.error('delete index', e)
      throw e
    }

    return false
  }

  public async count(params?: Omit<Count, 'index'>) {
    const nextParams: Count = {
      ...params,
      index: this.getIndex(),
    }

    try {
      const response = await this.client.count(nextParams)
      return response.body.count
    } catch (e) {
      this.logger.error('count', e)
    }

    return 0
  }

  public async save<T extends IndexData>(item: T, refresh?: 'wait_for' | boolean): Promise<string | null> {
    const { id } = item
    let dbItem = null
    if (id) {
      dbItem = await this.fetchById<T>(id)
    }

    let result = null
    const { id: skipId, ...data } = item
    if (dbItem && dbItem.id) {
      const resultUpdate = await this.updateDocument(dbItem.id, data, { refresh })

      if (resultUpdate) {
        result = dbItem.id
      }
    } else {
      const params: Omit<Index, 'index'> = {
        refresh,
        body: data,
      }

      try {
        const response = await this.indexDocument(params)

        if (response && response.statusCode !== 201) {
          this.logger.error('save', params, JSON.stringify(response))
        }

        if (response && response.statusCode === 201) {
          result = response.body._id
        }
      } catch (e) {
        this.logger.error('save', params)
      }
    }

    return result
  }

  public async deleteDocumentsByQuery(params: Omit<DeleteByQuery, 'index'>) {
    const nextParams: DeleteByQuery = {
      ...params,
      index: this.getIndex(),
    }

    return this.client.deleteByQuery(nextParams)
  }

  public async deleteDocument(id: string, params?: Omit<Delete, 'index' | 'id'>) {
    const nextParams: Delete = {
      ...params,
      id,
      index: this.getIndex(),
    }

    return this.client.delete(nextParams)
  }

  public async indexDocument(params: Omit<Index, 'index'>) {
    const nextParams: Index = {
      ...params,
      index: this.getIndex(),
    }

    return this.client.index(nextParams)
  }

  public async updateDocumentByQuery(params: Omit<UpdateByQuery, 'index'>) {
    const nextParams: UpdateByQuery = {
      ...params,
      index: this.getIndex(),
    }

    return this.client.updateByQuery(nextParams)
  }

  public async updateDocument(id: string, document: Record<string, any>, params?: Omit<Update, 'index' | 'id' | 'body'>) {
    const nextParams: Update = {
      ...params,
      id,
      index: this.getIndex(),
      body: {
        doc: document,
      },
    }

    return this.client.update(nextParams)
  }

  /**
   *
   * @param dataset
   * @param params
   * @return {Promise<string[]>} ids
   */
  public async bulkIndexDocument(dataset: Record<string, any>[], params?: Omit<Bulk, 'body'>): Promise<string[]> {
    const result = []

    const body = dataset.flatMap((doc) => [{ index: { _index: this.getIndex() } }, doc]) as any
    try {
      const nextParams: Bulk = {
        ...params,
        body,
      }

      const { body: bulkResponse } = await this.client.bulk(nextParams)

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

  public async searchDocumentById(id: string) {
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

  public async searchDocument(params: Omit<Search, 'index'>) {
    const nextParams: Search = {
      ...params,
      index: this.getIndex(),
    }

    return this.client.search(nextParams)
  }

  public async fetchById<T extends IndexData>(id: string): Promise<T | null> {
    const params = {
      id,
      index: this.getIndex(),
    }

    let result = null
    try {
      const { body } = await this.client.get(params, { ignore: [404] })

      if (body && body['_id'] && body['_source']) {
        result = {
          id,
          ...body['_source'],
        }
      }
    } catch (e) {
      this.logger.error('fetchById', JSON.stringify(e), params)
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
