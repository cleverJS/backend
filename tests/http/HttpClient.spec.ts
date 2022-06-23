import { HttpClient } from '../../core/http/client/HttpClient'
import { demoAppContainer } from '../setup/DemoAppContainer'
import { TArticle } from '../../demo/modules/article/Article'
import { ArticleHTTPController } from '../../demo/controllers/ArticleHTTPController'
import { createArticleTable } from '../migrations/tables'

describe('Test HttpClient', () => {
  const httpServer = demoAppContainer.httpServer
  const connection = demoAppContainer.connection
  const services = demoAppContainer.serviceContainer

  beforeAll(async () => {
    new ArticleHTTPController({
      http: httpServer,
      service: services.articleService,
    })
    await demoAppContainer.run()

    await createArticleTable(connection)
  })

  beforeEach(async () => {
    await connection.table('article').truncate()
    connection.batchInsert('article', [
      {
        title: 'The Fundamentals of Mathematical Analysis I',
        author: 'G. M. Fikhtengolts',
      },
      {
        title: 'The Fundamentals of Mathematical Analysis II',
        author: 'G. M. Fikhtengolts',
      },
    ])
  })

  afterAll(async () => {
    await connection.schema.dropTable('article')
    await demoAppContainer.destroy()()
  })

  test('should GET', async () => {
    const client = new HttpClient()
    const response = await client.get<IResponseArticleList>(`http://${httpServer.host}:${httpServer.port}/api/article/list`)
    expect(response.success).toBeTruthy()
    expect(response.data.result).toHaveLength(2)
  })
})

interface IResponseArticleList {
  success: boolean
  data: {
    result: TArticle[]
  }
}
