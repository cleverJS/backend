import path from 'path'
import { Client } from '@elastic/elasticsearch'
import { IndicesCreate, Search } from '@elastic/elasticsearch/api/requestParams'
import { AbstractElasticIndex } from '../../../core/db/elasticsearch/AbstractElasticIndex'
import { logger } from '../../../core/logger/logger'
import { ILoggerConfig } from '../../../core/logger/config'
import { TransportWinston } from '../../../core/logger/transport/TransportWinston'
import { settings } from '../../../demo/configs'

class TestIndex extends AbstractElasticIndex {
  public prefix: string = 'cleverjs'
  public index = 'test'

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

  protected createIndexParams(): IndicesCreate {
    return {
      index: this.getIndex(),
      body: {
        mappings: {
          properties: {
            keyword: { type: 'keyword' },
            text: { type: 'text' },
            integer: { type: 'integer', index: false },
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

  const index = new TestIndex(
    new Client({
      node: 'http://localhost:9200',
    })
  )

  beforeEach(async () => {
    await index.create()
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
  })
})
