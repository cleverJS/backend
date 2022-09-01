import { WSClient } from '../../../core/ws/WSClient'
import { WSServer } from '../../../core/ws/WSServer'
import { AbstractCRUDController } from '../../../demo/controllers/AbstractCRUDController'
import { Article } from '../../../demo/modules/article/Article'
import { ArticleService } from '../../../demo/modules/article/ArticleService'
import { createArticleTable } from '../../migrations/tables'
import { demoAppContainer } from '../../setup/DemoAppContainer'

const WS_URL = 'ws://localhost:8000/ws'

describe('Test AbstractCRUDController', () => {
  const wsServer: WSServer = demoAppContainer.wsServer
  const connection = demoAppContainer.connection
  const service = demoAppContainer.serviceContainer.articleService
  const wsClient = new WSClient(WS_URL, false)

  const currentDate = new Date('2022-06-22T08:44:48.000Z')

  const payload1 = {
    title: 'The Fundamentals of Mathematical Analysis I',
    author: 'G. M. Fikhtengolts',
    created: currentDate,
    content: '',
  }

  const payload2 = {
    title: 'The Fundamentals of Mathematical Analysis II',
    author: 'G. M. Fikhtengolts',
    created: currentDate,
    content: '',
  }

  beforeAll(async () => {
    await demoAppContainer.run()

    await wsClient.connect()
    await createArticleTable(connection)

    new ArticleController(wsServer, service, 'test')
  })

  beforeEach(async () => {
    await connection.table('article').truncate()
  })

  afterAll(async () => {
    await wsClient.disconnect()
    await connection.schema.dropTable('article')
    await demoAppContainer.destroy()()
  })

  it('should insert record', async () => {
    const result = await wsClient.call('test', 'save', payload1)
    expect(result.data.id).toEqual(1)

    const item = await service.findById(result.data.id)

    expect(item?.getData()).toEqual({
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis I',
      author: 'G. M. Fikhtengolts',
      content: '',
      created: currentDate,
      isPublished: false,
    })
  })

  it('should update record', async () => {
    let item: Article | null = service.createEntity(payload1)

    await service.save(item)
    expect(item.id).toEqual(1)

    const result = await wsClient.call('test', 'save', { ...payload1, title: 'The Fundamentals of Mathematical Analysis II', id: item.id })
    expect(result.data.id).toEqual(1)

    item = await service.findById(result.data.id)

    expect(item?.getData()).toEqual({
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis II',
      author: 'G. M. Fikhtengolts',
      content: '',
      created: currentDate,
      isPublished: false,
    })
  })

  it('should delete record', async () => {
    let item: Article | null = service.createEntity(payload1)

    await service.save(item)
    expect(item.id).toEqual(1)

    const result = await wsClient.call('test', 'delete', { id: item.id })
    expect(result.status).toEqual('success')

    expect(item.id).not.toBeNull()
    if (item.id) {
      item = await service.findById(item.id)
      expect(item).toBeNull()
    }
  })

  it('should fetch record by id', async () => {
    const item: Article | null = service.createEntity(payload1)

    await service.save(item)
    expect(item.id).toEqual(1)

    const result = await wsClient.call('test', 'fetch-by-id', { id: item.id })
    expect(result.status).toEqual('success')

    expect(result.data.item).toEqual({
      id: 1,
      title: 'The Fundamentals of Mathematical Analysis I',
      author: 'G. M. Fikhtengolts',
      content: '',
      created: '2022-06-22T08:44:48.000Z',
      isPublished: false,
    })
  })

  it('should fetch records', async () => {
    const item: Article | null = service.createEntity(payload1)

    await service.save(item)
    expect(item.id).toEqual(1)

    const item2: Article | null = service.createEntity(payload2)

    await service.save(item2)
    expect(item2.id).toEqual(2)

    const result = await wsClient.call('test', 'fetch-list', { sort: [{ name: 'id', dir: 'asc' }] })
    expect(result.status).toEqual('success')

    expect(result.data.total).toEqual(2)
    expect(result.data.items).toEqual([
      {
        id: 1,
        title: 'The Fundamentals of Mathematical Analysis I',
        author: 'G. M. Fikhtengolts',
        content: '',
        created: '2022-06-22T08:44:48.000Z',
        isPublished: false,
      },
      {
        id: 2,
        title: 'The Fundamentals of Mathematical Analysis II',
        author: 'G. M. Fikhtengolts',
        content: '',
        created: '2022-06-22T08:44:48.000Z',
        isPublished: false,
      },
    ])
  })
})

class ArticleController extends AbstractCRUDController<ArticleService> {
  protected shouldAuthorized = false
}
