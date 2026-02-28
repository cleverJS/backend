import { FastifyRequest } from 'fastify'

import { HttpServerFastify } from '../../core/http/servers/HttpServerFastify'
import { loggerNamespace } from '../../core/logger/logger'
import { Paginator } from '../../core/utils/Paginator'
import { ArticleService } from '../modules/article'

interface IDependencies {
  http: HttpServerFastify
  service: ArticleService
}

export class ArticleHTTPController {
  protected readonly logger = loggerNamespace('ArticleHTTPController')
  protected readonly deps: IDependencies

  public constructor(deps: IDependencies) {
    this.deps = deps
    this.init()
  }

  protected actionReplace = async (request: FastifyRequest): Promise<Record<string, any>> => {
    const { text, author } = request.body as IReplaceBodyRequest

    const result = this.deps.service.replaceAuthor(text, author)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  protected actionAuthorList = async (request: FastifyRequest): Promise<Record<string, any>> => {
    const { page, itemsPerPage } = request.query as IAuthorQueryRequest

    const paginator = new Paginator()
    paginator.setItemsPerPage(itemsPerPage)
    paginator.setCurrentPage(page)

    const result = await this.deps.service.fetchAuthorList(paginator)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  protected actionArticleList = async (request: FastifyRequest): Promise<Record<string, any>> => {
    const { page, itemsPerPage } = request.query as IAuthorQueryRequest

    const paginator = new Paginator()
    paginator.setItemsPerPage(itemsPerPage)
    paginator.setCurrentPage(page)

    const result = await this.deps.service.list(paginator)

    return {
      success: true,
      data: {
        result,
      },
    }
  }

  protected init(): void {
    this.deps.http.route({ method: 'POST', path: '/api/article/replace', handler: this.actionReplace })
    this.deps.http.route({ method: 'GET', path: '/api/article/authors', handler: this.actionAuthorList })
    this.deps.http.route({ method: 'GET', path: '/api/article/list', handler: this.actionArticleList })
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
