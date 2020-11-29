import { FastifyRequest } from 'fastify'
import { loggerNamespace } from '../../core/logger/logger'
import { HttpServer } from '../../core/http/HttpServer'
import { ArticleService } from '../modules/article/ArticleService'
import { Paginator } from '../../core/utils/Paginator'

interface IDependencies {
  http: HttpServer
  articleService: ArticleService
}

export class ArticleHTTPController {
  protected readonly logger = loggerNamespace('ArticleHTTPController')
  protected readonly deps: IDependencies

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.init()
  }

  protected actionReplace = async (request: FastifyRequest) => {
    const { text, author } = request.body as IReplaceBodyRequest

    const result = this.deps.articleService.replaceAuthor(text, author)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  protected actionAuthorList = async (request: FastifyRequest) => {
    const { page, itemsPerPage } = request.query as IAuthorQueryRequest

    const paginator = new Paginator()
    paginator.setItemsPerPage(itemsPerPage)
    paginator.setCurrentPage(page)

    const result = await this.deps.articleService.fetchAuthorList(paginator)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  protected actionArticleList = async (request: FastifyRequest) => {
    const { page, itemsPerPage } = request.query as IAuthorQueryRequest

    const paginator = new Paginator()
    paginator.setItemsPerPage(itemsPerPage)
    paginator.setCurrentPage(page)

    const result = await this.deps.articleService.list(paginator)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  protected init(): void {
    const instance = this.deps.http.getServer()
    instance.post('/api/article/replace', this.actionReplace)
    instance.get('/api/article/authors', this.actionAuthorList)
    instance.get('/api/article/list', this.actionArticleList)
  }
}

interface IReplaceBodyRequest {
  text: string
  author: string
}

interface IAuthorQueryRequest {
  page: number
  itemsPerPage: number
}
