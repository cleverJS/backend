import { Knex } from 'knex'
import { PassThrough } from 'stream'
import { types } from 'util'

import { loggerNamespace } from '../../logger/logger'
import { Paginator } from '../../utils/Paginator'
import { Condition, TConditionOperator } from '../Condition'

import { ConditionDbParser } from './condition/ConditionDbParser'
import { IDBResource } from './IDBResource'

export class DBKnexResource implements IDBResource {
  protected readonly logger = loggerNamespace(`DBKnexResource:${this.constructor.name}`)

  protected readonly table: string
  protected readonly primaryKey: string = 'id'
  protected readonly connection: Knex<any, unknown[]>
  protected readonly conditionParser: ConditionDbParser

  public constructor(connection: Knex<any, unknown[]>, conditionParser: ConditionDbParser, info: { table: string; primaryKey?: string }) {
    this.connection = connection
    this.conditionParser = conditionParser
    if (info.primaryKey) {
      this.primaryKey = info.primaryKey
    }
    this.table = info.table
  }

  public async query<R = Record<string, any>>(sql: string, binding?: Knex.RawBinding | Knex.RawBinding[] | Knex.ValueDict): Promise<R | null> {
    let result
    if (binding) {
      result = await this.connection.raw<R>(sql, binding)
    } else {
      result = await this.connection.raw<R>(sql)
    }

    return result as R | null
  }

  public findById<R = Record<string, any>>(id: string | number): Promise<R | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
    return this.findOne(condition)
  }

  public async findOne<R = Record<string, any>>(condition: Condition, connection?: Knex): Promise<R | null> {
    const paginator = new Paginator()
    paginator.setItemsPerPage(1)

    const result = await this.findAll<R>(condition, paginator, undefined, connection)
    if (result.length) {
      return result[0]
    }

    return null
  }

  public async findAll<R = Record<string, any>>(condition?: Condition, paginator?: Paginator, select?: string[], connection?: Knex): Promise<R[]> {
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)

    if (select) {
      queryBuilder.select(select)
    }

    this.applyPagination(paginator, condition, queryBuilder)
    condition = this.addDefaultSortIfNotSet(paginator, condition)

    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }

    let rows: R[] = []
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

  public async count(condition?: Readonly<Condition>, connection?: Knex): Promise<number> {
    let conditionClone: Condition | undefined
    if (condition) {
      conditionClone = condition.clone()
      conditionClone.clearSort()
    }
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)
    this.conditionParser.parse(queryBuilder, conditionClone)
    const result = await queryBuilder.count<{ count: number }[]>('* as count')
    if (result && result.length) {
      return result[0].count
    }

    return 0
  }

  public async insert(data: Record<string, any>, connection?: Knex): Promise<boolean> {
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)

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
        await this.changeEntity(data, identificator)
        result = true
      }
    }

    return result
  }

  public async update(condition: Readonly<Condition>, data: Record<string, any>, connection?: Knex): Promise<boolean> {
    return this.updateRaw(condition, data, connection)
  }

  public async updateRaw(condition: Readonly<Condition>, raw: Record<string, any>, connection?: Knex): Promise<boolean> {
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)

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

  public async batchInsert(rows: Record<string, any>[], chunkSize?: number, connection?: Knex): Promise<string[] | number[] | any> {
    const conn = connection || this.connection

    const rowsNext = rows.map((i) => {
      const { [this.primaryKey]: id, ...rowNext } = i
      return rowNext
    })

    let result
    if (['pg', 'mssql', 'oracle'].includes(this.connection.client.config.client)) {
      const batchInsertResult = await conn.batchInsert(this.table, rowsNext, chunkSize).returning(this.primaryKey)

      result = batchInsertResult.map((identificator) => {
        if (typeof identificator === 'object') {
          return identificator[this.primaryKey]
        }

        return identificator
      })
    } else {
      result = await conn.batchInsert(this.table, rows, chunkSize)
    }

    return result
  }

  public async truncate(requestor: string, connection?: Knex) {
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)
    let result
    try {
      result = await queryBuilder.truncate()
    } catch (e: any) {
      this.logger.error(e)
      throw e
    }

    return result
  }

  public async delete(id: string | number, requestor: string, connection?: Knex) {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
    return this.deleteAll(condition, requestor, connection)
  }

  public async deleteAll(condition: Condition, requestor: string, connection?: Knex) {
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)
    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }

    const response = await queryBuilder.delete()

    return response > 0
  }

  public stream<R = Record<string, any>>(
    condition?: Condition,
    select?: string[],
    paginator?: Paginator,
    connection?: Knex
  ): PassThrough & AsyncIterable<R> {
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)

    if (select) {
      queryBuilder.select(select)
    }

    if (paginator) {
      this.applyPagination(paginator, condition, queryBuilder)
      condition = this.addDefaultSortIfNotSet(paginator, condition)
    }

    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }

    return queryBuilder.stream()
  }

  public getPrimaryKey(): string {
    return this.primaryKey
  }

  public getTable(): string {
    return this.table
  }

  public getConnection(): Knex {
    return this.connection
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

  protected async changeEntity(data: Record<string, any>, id?: any) {
    if (id && this.primaryKey) {
      if (data?.[this.primaryKey]) {
        Object.defineProperty(data, this.primaryKey, { value: id })
      } else {
        Object.assign(data, { [this.primaryKey]: id })
      }
    }
  }
}
