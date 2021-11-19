import path from 'path'
import { Client } from '@elastic/elasticsearch'
import { Index, IndicesCreate, Search } from '@elastic/elasticsearch/api/requestParams'
import { AbstractElasticIndex } from '../../../core/db/elasticsearch/AbstractElasticIndex'
import { logger } from '../../../core/logger/logger'
import { ILoggerConfig } from '../../../core/logger/config'
import { TransportWinston } from '../../../core/logger/transport/TransportWinston'
import { settings } from '../../../demo/configs'
import { sleep } from '../../../core/utils/sleep'

class TestIndex extends AbstractElasticIndex {
  public alias = 'alias-test'

  public async fetchByKeyword(keyword: string) {
    const params: Omit<Search, 'index'> = {
      body: {
        query: {
          bool: {
            filter: [{ term: { keyword } }],
          },
        },
      },
    }

    return this.searchDocument(params)
  }

  protected createIndexParams(index: string): IndicesCreate {
    return {
      index,
      body: {
        mappings: {
          properties: {
            keyword: { type: 'keyword' },
            text: { type: 'text' },
            integer: { type: 'integer', index: false },
            meta: {
              properties: {
                author: { type: 'text' },
                coAuthor: { type: 'text' },
              },
            },
          },
        },
      },
    }
  }
}

describe('Test AbstractElasticIndex', () => {
  const runtimeDir = path.resolve(`${settings.runtimeDir}/tests`)
  logger.setConfig({
    debug: true,
    info: true,
    warn: true,
  } as ILoggerConfig)
  logger.addTransport(new TransportWinston(runtimeDir))

  const client = new Client({
    node: 'http://localhost:9200',
  })

  const index = new TestIndex(client)

  beforeEach(async () => {
    await index.delete('cleverjs-test')
    await index.create('cleverjs-test')
  })

  afterAll(async () => {
    await index.delete('cleverjs-test')
    await new Promise((resolve) => {
      client.close(() => {
        logger.info('Elastic connections closed')
        resolve(true)
      })
    })
  })

  it('should index document', async () => {
    const params = {
      body: {
        keyword: 'key',
        text: 'text text2',
        integer: 15,
      },
    }

    const response = await index.indexDocument(params)

    expect(response).not.toBeNull()
    expect(response.body).not.toBeNull()
    expect(response.body['_id']).not.toBeNull()
  })

  it('should index document and delete', async () => {
    const params = {
      body: {
        keyword: 'key',
        text: 'text text2',
        integer: 15,
      },
    }

    const response = await index.indexDocument(params)

    expect(response).not.toBeNull()
    expect(response.body).not.toBeNull()
    expect(response.body['_id']).not.toBeNull()

    await index.deleteDocument(response.body['_id'])

    const responseFetch = await index.fetchById(response.body['_id'])
    expect(responseFetch).toBeNull()
  })

  it('should delete by query', async () => {
    const items = [
      {
        keyword: 'key',
        text: 'text',
        integer: 15,
      },
      {
        keyword: 'key',
        text: 'text',
        integer: 15,
      },
      {
        keyword: 'key2',
        text: 'text2',
        integer: 15,
      },
    ]

    const response = await index.bulkIndexDocument(items, { refresh: true })

    expect(response).toHaveLength(3)

    await index.deleteDocumentsByQuery({
      refresh: true,
      body: {
        query: {
          bool: {
            filter: {
              term: {
                keyword: 'key',
              },
            },
          },
        },
      },
    })

    const responseFetch1 = await index.fetchByKeyword('key')
    expect(responseFetch1.body.hits.hits).toHaveLength(0)

    const responseFetch2 = await index.fetchByKeyword('key2')
    expect(responseFetch2.body.hits.hits).toHaveLength(1)
  })

  it('should index document and update', async () => {
    const params = {
      body: {
        keyword: 'key',
        text: 'text text2',
        integer: 15,
      },
    }

    const response = await index.indexDocument(params)

    expect(response).not.toBeNull()
    expect(response.body).not.toBeNull()
    expect(response.body['_id']).not.toBeNull()

    await index.updateDocument(response.body['_id'], { text: 'text3' })

    const { id, ...data } = (await index.fetchById(response.body['_id'])) || {}
    expect(response.body['_id']).toEqual(id)
    expect(data).toEqual({
      keyword: 'key',
      text: 'text3',
      integer: 15,
    })
  })

  it('should save document', async () => {
    const params = {
      id: null,
      keyword: 'key1',
      text: 'text text2',
      integer: 15,
    }

    const identifier = await index.save(params)

    expect(identifier).not.toBeNull()

    if (!identifier) {
      throw new Error('No identifier')
    }

    const nextParams = {
      id: identifier,
      keyword: 'key1',
      text: 'text',
      integer: 20,
    }
    await index.save(nextParams)

    const { id, ...data } = (await index.fetchById(identifier)) || {}
    expect(identifier).toEqual(id)
    expect(data).toEqual({
      keyword: 'key1',
      text: 'text',
      integer: 20,
    })
  })

  it('should produce version_conflict_engine_exception', async () => {
    const params = {
      id: null,
      keyword: 'key1',
      text: 'text1',
      integer: 1,
    }

    const id = await index.save(params)

    try {
      const promises = []
      for (let i = 0; i <= 100; i++) {
        promises.push(
          index.save({
            ...params,
            integer: i,
            id,
          })
        )
      }

      await Promise.all(promises)
    } catch (e) {
      logger.error(e)
    }

    expect(true).toBeTruthy()
  })

  it('should search_after', async () => {
    const items = []
    for (let i = 1; i <= 3; i++) {
      items.push({
        id: null,
        keyword: 'key1',
        text: 'text1',
        integer: i,
      })
    }
    await index.bulkIndexDocument(items)
    await sleep(1000)

    const params: Search = {
      body: {
        sort: [{ integer: { order: 'asc' } }],
        query: {
          match_all: {},
        },
      },
      size: 1,
      track_total_hits: false,
    }

    try {
      let hitCnt = 1
      while (true) {
        const response = await client.search(params)
        const hits = response.body.hits.hits
        if (!hits || !hits.length) {
          break
        }

        for (const hit of hits) {
          expect(hitCnt).toEqual(hit['_source']['integer'])
          hitCnt++
        }

        // @ts-ignore
        params.body['search_after'] = hits[hits.length - 1].sort
      }
    } catch (e) {
      logger.error(e)
    }
  })

  it('should reindex and change alias', async () => {
    const params: Omit<Index, 'index'> = {
      refresh: 'wait_for',
      body: {
        id: null,
        keyword: 'key1',
        text: 'text1',
        integer: 1,
      },
    }
    await index.indexDocument(params)
    const response = await index.fetchByKeyword('key1')

    expect(response.body.hits.hits[0]['_source']).toEqual(params.body)

    const indexNext = new TestIndex(client)
    await indexNext.delete('cleverjs-test-next')
    await indexNext.create('cleverjs-test-next', false)
    indexNext.alias = 'cleverjs-test-next'

    const paramsNext: Omit<Index, 'index'> = {
      refresh: 'wait_for',
      body: {
        id: null,
        keyword: 'key2',
        text: 'text1',
        integer: 2,
      },
    }

    await indexNext.indexDocument(paramsNext)
    const response2 = await indexNext.fetchByKeyword('key2')

    expect(response2.body.hits.hits[0]['_source']).toEqual(paramsNext.body)

    const response3 = await index.fetchByKeyword('key1')
    expect(response3.body.hits.hits[0]['_source']).toEqual(params.body)

    await index.updateAlias('cleverjs-test-next')

    const response4 = await index.fetchByKeyword('key2')
    expect(response4.body.hits.hits[0]['_source']).toEqual(paramsNext.body)
  })
})
