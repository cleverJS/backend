import { Client } from '@elastic/elasticsearch'
import {
  Bulk,
  Count,
  Delete,
  DeleteByQuery,
  Index,
  IndicesCreate,
  Msearch,
  Search,
  Update,
  UpdateByQuery,
} from '@elastic/elasticsearch/api/requestParams'
import { ApiResponse, TransportRequestOptions } from '@elastic/elasticsearch/lib/Transport'

import { loggerNamespace } from '../../logger/logger'

export interface IndexData {
  id: string | null
}

export abstract class AbstractElasticIndex {
  public abstract alias: string
  protected readonly logger = loggerNamespace('AbstractElasticIndex')
  protected readonly client: Client

  public constructor(client: Client) {
    this.client = client
  }

  public async create(index: string, updateAlias: boolean = true) {
    let result = false
    let responseExists
    try {
      responseExists = await this.client.indices.exists({ index })
      if (!responseExists || !responseExists.body) {
        const indexParams = this.createIndexParams(index)
        indexParams.index = index
        const response = await this.client.indices.create(indexParams)
        result = response && response.statusCode === 200 && response.body.acknowledged

        if (result && updateAlias) {
          await this.updateAlias(index)
        }
      }
    } catch (e) {
      this.logger.error('create index', JSON.stringify(responseExists), e)
      throw e
    }

    return result
  }

  public async delete(index: string) {
    try {
      const responseExists = await this.client.indices.exists({ index })
      if (responseExists && responseExists.body) {
        const responseDelete = await this.client.indices.delete({ index })
        return responseDelete && responseDelete.statusCode === 200 && responseDelete.body.acknowledged
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
      index: this.alias,
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
      const resultUpdate = await this.updateDocument(dbItem.id, data, { refresh, retry_on_conflict: 6 })

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

  public async deleteDocumentsByQuery(params: Omit<DeleteByQuery, 'index'>, options?: TransportRequestOptions) {
    const nextParams: DeleteByQuery = {
      ...params,
      index: this.alias,
    }

    return this.client.deleteByQuery(nextParams, options)
  }

  public async deleteDocument(id: string, params?: Omit<Delete, 'index' | 'id'>, options?: TransportRequestOptions) {
    const nextParams: Delete = {
      ...params,
      id,
      index: this.alias,
    }

    return this.client.delete(nextParams, options)
  }

  public async indexDocument(params: Omit<Index, 'index'>, options?: TransportRequestOptions) {
    const nextParams: Index = {
      ...params,
      index: this.alias,
    }

    return this.client.index(nextParams, options)
  }

  public async updateDocumentByQuery(params: Omit<UpdateByQuery, 'index'>) {
    const nextParams: UpdateByQuery = {
      ...params,
      index: this.alias,
    }

    return this.client.updateByQuery(nextParams)
  }

  public async updateDocument(id: string, document: Record<string, any>, params?: Omit<Update, 'index' | 'id' | 'body'>) {
    const nextParams: Update = {
      ...params,
      id,
      index: this.alias,
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

    const body = dataset.flatMap((doc) => [{ index: { _index: this.alias } }, doc]) as any
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
          result.push(item.index._id)
        }
      }
    } catch (e) {
      this.logger.error(e)
    }

    return result
  }

  public async searchDocumentById(id: string) {
    const params = {
      index: this.alias,
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
      index: this.alias,
    }

    return this.client.search(nextParams)
  }

  public async fetchById<T extends IndexData>(id: string): Promise<T | null> {
    const params = {
      id,
      index: this.alias,
    }

    let result = null
    try {
      const { body } = await this.client.get(params, { ignore: [404] })

      if (body && body._id && body._source) {
        result = {
          id,
          ...body._source,
        }
      }
    } catch (e) {
      this.logger.error('fetchById', JSON.stringify(e), params)
    }

    return result
  }

  public async *searchDocumentBulk(params: Record<string, any>) {
    params.index = this.alias
    params.scroll = '10s'

    let response = await this.client.search(params)

    while (true) {
      const sourceHits = response.body.hits.hits

      if (sourceHits.length === 0) {
        break
      }

      for (const hit of sourceHits) {
        yield hit
      }

      if (!response.body._scroll_id) {
        break
      }

      response = await this.client.scroll({
        scroll_id: response.body._scroll_id,
        scroll: params.scroll,
      })
    }
  }

  public multiSearch(dataset: Record<string, any>[]): Promise<ApiResponse | null> {
    const body = dataset.flatMap((doc) => [{ index: this.alias }, doc]) as any

    const p: Msearch = {
      body,
    }

    if (body.length !== 0 && body.length % 2 === 0) {
      return this.client.msearch(p)
    }

    return Promise.resolve(null)
  }

  public async updateAlias(newIndex: string): Promise<void> {
    try {
      const actions = []

      const index = await this.getIndexByAlias(this.alias)
      let createAlias = true
      if (index) {
        if (index !== newIndex) {
          actions.push({
            remove: { index, alias: this.alias },
          })
        } else {
          createAlias = false
        }
      }

      if (createAlias) {
        actions.push({
          add: { index: newIndex, alias: this.alias },
        })

        await this.client.indices.updateAliases({
          body: {
            actions,
          },
        })
      }
    } catch (e) {
      this.logger.error(e)
    }
  }

  public async getIndexByAlias(alias: string) {
    let index = null
    try {
      const response = await this.client.indices.getAlias(
        {
          name: alias,
        },
        { ignore: [404] }
      )

      if (response.statusCode === 200) {
        index = Object.keys(response.body)[0]
      }
    } catch (e) {
      this.logger.error(e)
    }

    return index
  }

  protected abstract createIndexParams(index: string): IndicesCreate
}
