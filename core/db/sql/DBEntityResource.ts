import { PassThrough, Transform } from 'stream'

import { IEntity } from '../../entity/AbstractEntity'
import { IEntityFactory } from '../../entity/EntityFactory'
import { loggerNamespace } from '../../logger/logger'
import { isInstanceOf } from '../../utils/common'
import { Paginator } from '../../utils/Paginator'
import { TEntityFrom } from '../../utils/types'
import { Condition, TConditionOperator } from '../Condition'

import { AbstractEntityResource } from './AbstractEntityResource'
import { IDBResource } from './IDBResource'

export abstract class DBEntityResource<E extends IEntity> extends AbstractEntityResource<E> {
  protected readonly logger = loggerNamespace(`DBEntityResource:${this.constructor.name}`)
  protected readonly resource: IDBResource
  readonly #entityFactory: IEntityFactory
  readonly #primaryKey: string

  public constructor(resource: IDBResource, entityFactory: IEntityFactory) {
    super()
    this.#entityFactory = entityFactory
    this.resource = resource
    this.#primaryKey = resource.getPrimaryKey()
  }

  public findById(id: string | number): Promise<E | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.#primaryKey, value: id }] })
    return this.findOne(condition)
  }

  public async findOne(condition: Condition, connection?: unknown): Promise<E | null> {
    const paginator = new Paginator()
    paginator.setItemsPerPage(1)

    const result = await this.findAll(condition, paginator, undefined, connection)
    if (result.length) {
      return result[0]
    }

    return null
  }

  public async findAll(condition?: Condition, paginator?: Paginator, select?: string[], connection?: unknown): Promise<E[]> {
    const rows = await this.resource.findAll<TEntityFrom<E>>(condition, paginator, select, connection)

    const promises = []
    for (const row of rows) {
      promises.push(this.map(row))
    }

    return this.createEntityList(await Promise.all(promises), false)
  }

  public async findAllRaw<T extends Record<string, any> = Record<string, any>>(
    condition?: Condition,
    paginator?: Paginator,
    select?: string[],
    connection?: unknown
  ): Promise<T[]> {
    return this.resource.findAll<T>(condition, paginator, select, connection)
  }

  public async save(item: E, connection?: unknown) {
    let result = false

    if (item) {
      const { id } = item
      if (id) {
        const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.#primaryKey, value: id }] })
        result = await this.update(condition, item, connection)
      } else {
        result = await this.insert(item, connection)
      }
    }

    return result
  }

  public async update(condition: Readonly<Condition>, item: E, connection?: unknown): Promise<boolean> {
    const data = await this.mapToDB(item)
    const result = await this.resource.update(condition, data, connection)
    if (result) {
      await this.afterUpdate(data)
    }

    return result
  }

  public async insert(item: E, connection?: unknown): Promise<boolean> {
    const data = await this.mapToDB(item)
    const result = await this.resource.insert(data, connection)
    if (result) {
      await this.changeEntity(item, data, data?.id)
      await this.afterInsert(data)
    }

    return result
  }

  public async batchInsert(items: E[], chunkSize?: number, connection?: unknown): Promise<string[] | number[] | any> {
    const rows = items.map((i) => this.mapToDB(i))
    return this.batchInsertRaw(await Promise.all(rows), chunkSize, connection)
  }

  public async batchInsertRaw(rows: Record<string, any>[], chunkSize?: number, connection?: unknown): Promise<string[] | number[] | any> {
    const result = await this.resource.batchInsert(rows, chunkSize, connection)

    if (isInstanceOf<boolean>(result, (i) => typeof result === 'boolean' && result) || result?.length) {
      await this.afterBatchInsert(rows)
    }

    return result
  }

  public async count(condition?: Readonly<Condition>, connection?: unknown): Promise<number> {
    return this.resource.count(condition, connection)
  }

  public async delete(id: string | number, requestor: string, connection?: unknown) {
    return this.resource.delete(id, requestor, connection)
  }

  public async deleteAll(condition: Condition, requestor: string, connection?: unknown) {
    await this.beforeDelete(condition, requestor)
    return this.resource.deleteAll(condition, requestor, connection)
  }

  public async truncate(requestor: string, connection?: unknown) {
    await this.beforeTruncate(requestor)
    return this.resource.truncate(requestor, connection)
  }

  public stream(condition?: Condition, select?: string[], connection?: unknown): PassThrough & AsyncIterable<E> {
    const stream = this.streamRaw<TEntityFrom<E>>(condition, select, connection)
    const map = this.map.bind(this)
    const createEntity = this.createEntity.bind(this)
    const transform = new Transform({
      objectMode: true,
      async transform(chunk: TEntityFrom<E>, encoding, callback) {
        try {
          const mappedChunk = await map(chunk)
          const nextChunk = await createEntity(mappedChunk)
          this.push(nextChunk)
          callback()
        } catch (e: any) {
          callback(e)
        }
      },
    })

    return stream.pipe(transform)
  }

  public streamRaw<T>(condition?: Condition, select?: string[], connection?: unknown): PassThrough & AsyncIterable<T> {
    return this.resource.stream<T>(condition, select, connection)
  }

  public createEntity(data: Partial<TEntityFrom<E>>, clone: boolean = true): Promise<E> {
    return <Promise<E>>this.#entityFactory.create(data, clone)
  }

  public async createEntityList(rows: Partial<TEntityFrom<E>>[], clone: boolean = true) {
    let result: E[] = []

    const promises = []
    for (const row of rows) {
      const entity = this.createEntity(row, clone)
      promises.push(entity)
    }

    result = await Promise.all(promises)

    return result
  }

  public async map(data: Record<string, any>): Promise<any> {
    if (this.#primaryKey !== 'id' && data?.[this.#primaryKey]) {
      data.id = data[this.#primaryKey]
    }

    return data
  }

  public async mapToDB(item: E): Promise<any> {
    const { id, [this.#primaryKey]: primaryKey, ...data } = item.getData(true)
    return data
  }

  public getPrimaryKey() {
    return this.#primaryKey
  }

  protected async changeEntity(item: E, data: Record<string, any>, id?: any) {
    id = id || item.id
    const mappedData = await this.map(data)
    item.setData(mappedData, true)
    item.id = id

    if (this.#primaryKey && this.#primaryKey !== 'id') {
      Object.defineProperty(item, this.#primaryKey, { value: id })
    }
  }

  protected async beforeDelete(condition: Condition, requestor: string) {}
  protected async beforeTruncate(requestor: string) {}
  protected async afterBatchInsert(data: Record<string, any>[]) {}
  protected async afterInsert(item: E) {}
  protected async afterUpdate(item: E) {}
}
