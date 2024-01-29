import { Knex } from 'knex'
import { types } from 'util'

import { IEntity } from '../../entity/AbstractEntity'
import { IEntityFactory } from '../../entity/EntityFactory'
import { loggerNamespace } from '../../logger/logger'
import { Paginator } from '../../utils/Paginator'
import { TEntityFrom } from '../../utils/types'
import { AbstractResource } from '../AbstractResource'
import { Condition, TConditionOperator } from '../Condition'

import { ConditionDbParser } from './condition/ConditionDbParser'

export abstract class AbstractDBResource<E extends IEntity> extends AbstractResource<E> {
  protected readonly logger = loggerNamespace(`AbstractDBResource:${this.constructor.name}`)
  protected readonly primaryKey: string = 'id'
  protected readonly connection: Knex<any, unknown[]>
  protected readonly conditionParser: ConditionDbParser

  public constructor(connection: Knex<any, unknown[]>, conditionParser: ConditionDbParser, entityFactory: IEntityFactory) {
    super(entityFactory)
    this.connection = connection
    this.conditionParser = conditionParser
  }

  public findById(id: string | number): Promise<E | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
    return this.findOne(condition)
  }

  public async findOne(condition: Condition): Promise<E | null> {
    const paginator = new Paginator()
    paginator.setItemsPerPage(1)

    const result = await this.findAll(condition, paginator)
    if (result.length) {
      return result[0]
    }

    return null
  }

  public async findAll(condition?: Condition, pagination?: Paginator): Promise<E[]> {
    const rows = await this.findAllRaw<TEntityFrom<E>>(condition, pagination)
    return this.createEntityList(rows.map(this.map.bind(this)), false)
  }

  public async findAllRaw<T extends Record<string, any> = Record<string, any>>(
    condition?: Condition,
    pagination?: Paginator,
    select?: string[]
  ): Promise<T[]> {
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)

    if (select) {
      queryBuilder.select(select)
    }

    this.applyPagination(pagination, condition, queryBuilder)
    condition = this.addDefaultSortIfNotSet(pagination, condition)

    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }

    let rows: T[] = []
    try {
      rows = await queryBuilder.select()
    } catch (e: any) {
      if (types.isNativeError(e)) {
        this.logger.error(e.message, queryBuilder.toQuery())
      }

      throw new Error(e.message, { cause: e })
    }

    return rows
  }

  protected applyPagination(pagination: Paginator | undefined, condition: Condition | undefined, queryBuilder: Knex.QueryBuilder) {
    if (pagination) {
      if (pagination.getLimit()) {
        queryBuilder.limit(pagination.getLimit())
      }

      if (pagination.getOffset()) {
        queryBuilder.offset(pagination.getOffset())
      }
    }

    return condition
  }

  protected addDefaultSortIfNotSet(pagination: Paginator | undefined, condition: Condition | undefined) {
    if (pagination) {
      if (!condition) {
        condition = new Condition(undefined)
      } else if (condition.getSort().length === 0) {
        condition = condition.clone()
      }

      if (!condition.getSort().length && pagination.getLimit() > 1) {
        condition.setSort(this.primaryKey, 'asc')
      }
    }

    return condition
  }

  public async count(condition?: Readonly<Condition>): Promise<number> {
    let conditionClone: Condition | undefined
    if (condition) {
      conditionClone = condition.clone()
      conditionClone.clearSort()
    }
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)
    this.conditionParser.parse(queryBuilder, conditionClone)
    const result = await queryBuilder.count<{ count: number }[]>('* as count')
    if (result && result.length) {
      return result[0].count
    }

    return 0
  }

  public async save(item: E) {
    let result = false

    if (item) {
      const { id } = item
      if (id) {
        const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
        result = await this.update(condition, item)
      } else {
        result = await this.insert(item)
      }
    }

    return result
  }

  public async insert(item: E): Promise<any | null> {
    const data = this.mapToDB(item)

    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)

    let insertResult
    try {
      if (['pg', 'mssql', 'oracle'].includes(this.connection.client.config.client)) {
        insertResult = await queryBuilder.insert(data).returning(this.primaryKey)
      } else {
        insertResult = await queryBuilder.insert(data)
      }
    } catch (e: any) {
      if (types.isNativeError(e)) {
        this.logger.error(e.message, queryBuilder.toQuery())
      }

      throw new Error(e.message, { cause: e })
    }

    let result = false

    if (insertResult && insertResult.length > 0) {
      let [identificator] = insertResult

      if (typeof identificator === 'object') {
        identificator = identificator[this.primaryKey]
      }

      if (identificator) {
        this.changeEntity(item, data, identificator)
        await this.afterInsert(item)
        result = true
      }
    }

    return result
  }

  public async update(condition: Readonly<Condition>, item: E): Promise<boolean> {
    const data = this.mapToDB(item)

    const result = await this.updateRaw(condition, data)

    if (result) {
      this.changeEntity(item, data)
      await this.afterUpdate(item)
    }

    return result
  }

  public async updateRaw(condition: Readonly<Condition>, raw: Record<string, any>): Promise<boolean> {
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)

    let result = 0
    try {
      this.conditionParser.parse(queryBuilder, condition)
      result = await queryBuilder.update(raw)
    } catch (e: any) {
      if (types.isNativeError(e)) {
        this.logger.error(queryBuilder.toQuery(), e.message)
      }

      throw new Error(e.message, { cause: e })
    }

    return result > 0
  }

  public async batchInsert(items: E[], chunkSize?: number): Promise<string[] | number[] | any> {
    const rows = items.map((i) => this.mapToDB(i))
    return this.batchInsertRaw(rows, chunkSize)
  }

  public async batchInsertRaw(rows: Record<string, any>[], chunkSize?: number): Promise<string[] | number[] | any> {
    const rowsNext = rows.map((i) => {
      const { [this.primaryKey]: id, ...rowNext } = i
      return rowNext
    })

    let result
    if (['pg', 'mssql', 'oracle'].includes(this.connection.client.config.client)) {
      const batchInsertResult = await this.connection.batchInsert(this.table, rowsNext, chunkSize).returning(this.primaryKey)

      result = batchInsertResult.map((identificator) => {
        if (typeof identificator === 'object') {
          return identificator[this.primaryKey]
        }

        return identificator
      })
    } else {
      result = await this.connection.batchInsert(this.table, rows, chunkSize)
    }

    await this.afterBatchInsert(rows)

    return result
  }

  public async truncate(requestor: string) {
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)
    let result
    try {
      await this.beforeTruncate(requestor)
      result = await queryBuilder.truncate()
    } catch (e: any) {
      this.logger.error(e)
      throw e
    }

    return result
  }

  public async delete(id: string | number, requestor: string) {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
    return this.deleteAll(condition, requestor)
  }

  public async deleteAll(condition: Condition, requestor: string) {
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)
    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }

    await this.beforeDelete(condition, requestor)
    const response = await queryBuilder.delete()

    return response > 0
  }

  public createEntity(data: Partial<TEntityFrom<E>>, clone: boolean = true): Promise<E> {
    return <Promise<E>>this.entityFactory.create(data, clone)
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

  public map(data: Record<string, any>): any {
    if (this.primaryKey !== 'id' && data?.[this.primaryKey]) {
      data.id = data[this.primaryKey]
    }

    return data
  }

  public mapToDB(item: E): any {
    const { id, [this.primaryKey]: primaryKey, ...data } = item.getData(true)
    return data
  }

  protected changeEntity(item: E, data: Record<string, any>, id?: any) {
    id = id || item.id
    item.setData(this.map(data), true)
    item.id = id

    if (this.primaryKey && this.primaryKey !== 'id') {
      Object.defineProperty(item, this.primaryKey, { value: id })
    }
  }

  protected async beforeDelete(condition: Condition, requestor: string) {}
  protected async beforeTruncate(requestor: string) {}
  protected async afterBatchInsert(rows: Record<string, any>[]) {}
  protected async afterInsert(item: E) {}
  protected async afterUpdate(item: E) {}
}
