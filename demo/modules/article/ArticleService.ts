import TypedEmitter from 'typed-emitter'
import { EventEmitter } from 'events'
import { AbstractService } from '../../../core/AbstractService'
import { Condition, TConditionOperator } from '../../../core/db/Condition'
import { Article } from './Article'
import { Paginator } from '../../../core/utils/Paginator'
import { ArticleResource } from './resource/ArticleResource'
import { cacheContainer } from '../../CacheContainer'
import { Cache } from '../../../core/cache/Cache'

export interface ArticleEvents {
  new: (item: Article) => void
}

export class ArticleService extends AbstractService<Article, ArticleResource> {
  public readonly eventEmitter: TypedEmitter<ArticleEvents> = new EventEmitter()

  public async findByAuthor(author: string): Promise<Article | null> {
    return cacheContainer.cacheRuntime.getOrSet(
      author,
      () => {
        const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'author', value: author }] })
        return this.resource.findOne(condition)
      },
      Cache.TTL_10MIN,
      ['article']
    )
  }

  public async fetchAuthorList(paginator: Readonly<Paginator>): Promise<string[]> {
    return cacheContainer.cacheRuntime.getOrSet(
      'authors',
      async () => {
        const items = await this.findAll(undefined, paginator)
        return items.map((i) => i.author)
      },
      Cache.TTL_10MIN,
      ['article']
    )
  }

  public async replaceAuthor(text: string, author: string): Promise<string> {
    const result = text.replace('{{author}}', author)
    await cacheContainer.cacheRuntime.clearByTag('article')
    return result
  }

  public async save(item: Article): Promise<boolean> {
    const result = await super.save(item)

    if (result) {
      this.eventEmitter.emit('new', item)
    }

    return result
  }
}
