import { Client } from '@elastic/elasticsearch'

import { logger } from '../../../../../core/logger/logger'
import { settings } from '../../../../../demo/configs'
import { ArticleIndex, ArticleIndexData } from '../../../../../demo/modules/article/index/ArticleIndex'

describe('Test ArticleIndex', () => {
  const indexName = 'demo-article'

  const payload1 = {
    title: 'The Fundamentals of Mathematical Analysis I',
    author: 'G. M. Fikhtengolts',
  }

  const payload2 = {
    title: 'The Fundamentals of Mathematical Analysis II',
    author: 'G. M. Fikhtengolts',
  }

  const payload3 = {
    title: 'The Fundamentals of Mathematical Analysis III',
    author: 'G. M. Fikhtengolts',
  }

  const elasticClient = new Client(settings.elastic)
  const index = new ArticleIndex(elasticClient)

  beforeEach(async () => {
    await index.delete(indexName)
    await index.create(indexName)
  })

  afterAll(async () => {
    await index.delete(indexName)
    await new Promise((resolve) => {
      elasticClient.close(() => {
        logger.info('Elastic connections closed')
        resolve(true)
      })
    })
  })

  test('should index item', async () => {
    const document = await index.indexDocument({
      body: payload1,
    })
    expect(document).not.toBeNull()
    const id = document.body['_id']
    expect(id).not.toBeNull()

    if (id) {
      const item = await index.fetchById<ArticleIndexData>(id)
      expect(item).not.toBeNull()
      expect(item).toEqual({
        id,
        title: 'The Fundamentals of Mathematical Analysis I',
        author: 'G. M. Fikhtengolts',
      })
    }
  })

  test('should bulk index item', async () => {
    const ids = await index.bulkIndexDocument([payload1, payload2, payload3])
    expect(ids).toHaveLength(3)
  })

  test('should update item partially', async () => {
    const document = await index.indexDocument({
      body: payload1,
    })
    expect(document).not.toBeNull()
    const id = document.body['_id']
    expect(id).not.toBeNull()

    if (id) {
      await index.updateDocument(id, {
        title: 'The Fundamentals of Mathematical Analysis II',
      })

      const item = await index.fetchById<ArticleIndexData>(id)
      expect(item).not.toBeNull()
      expect(item).toEqual({
        id,
        title: 'The Fundamentals of Mathematical Analysis II',
        author: 'G. M. Fikhtengolts',
      })
    }
  })

  test('should save item', async () => {
    const document = await index.indexDocument({
      body: payload1,
    })

    expect(document).not.toBeNull()
    const id = document.body['_id']
    expect(id).not.toBeNull()

    if (id) {
      const item = await index.fetchById<ArticleIndexData>(id)
      expect(item).not.toBeNull()

      if (item) {
        item.title = 'The Fundamentals of Mathematical Analysis II'
        await index.save(item)

        const itemNext = await index.fetchById<ArticleIndexData>(id)
        expect(itemNext).not.toBeNull()
        expect(itemNext).toEqual({
          id,
          title: 'The Fundamentals of Mathematical Analysis II',
          author: 'G. M. Fikhtengolts',
        })
      }
    }

    const id2 = await index.save({
      ...payload3,
      id: null,
      content: '',
      isPublished: false,
    })

    expect(id2).not.toBeNull()

    if (id2) {
      const item2 = await index.fetchById<ArticleIndexData>(id2)
      expect(item2).not.toBeNull()
      expect(item2).toEqual({
        id: id2,
        title: 'The Fundamentals of Mathematical Analysis III',
        author: 'G. M. Fikhtengolts',
        content: '',
        isPublished: false,
      })
    }
  })
})
