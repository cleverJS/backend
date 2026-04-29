import { Knex } from 'knex'
import { PassThrough } from 'stream'

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

  public async query<R = Record<string, any>>(sql: string, binding?: Knex.RawBinding[] | Knex.ValueDict): Promise<R | null> {
    let result
    if (binding !== undefined) {
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

    try {
      return (await queryBuilder.select()) as R[]
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      this.logger.error(err.message, queryBuilder.toQuery())
      throw new Error(err.message, { cause: e })
    }
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
    if (result.length > 0) {
      return result[0].count
    }

    return 0
  }

  public async insert(data: Record<string, any>, connection?: Knex): Promise<boolean> {
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)

    let insertResult: Array<number | Record<string, string | number>>
    try {
      if (this.isReturningClient()) {
        insertResult = await queryBuilder.insert(data).returning(this.primaryKey)
      } else {
        insertResult = await queryBuilder.insert(data)
      }
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      this.logger.error(err.message, queryBuilder.toQuery())
      throw new Error(err.message, { cause: e })
    }

    if (insertResult.length === 0) {
      return false
    }

    const [first] = insertResult
    const identificator = typeof first === 'object' ? first[this.primaryKey] : first

    if (!identificator) {
      return false
    }

    this.changeEntity(data, identificator)
    return true
  }

  public async update(condition: Readonly<Condition>, data: Record<string, any>, connection?: Knex): Promise<boolean> {
    return this.updateRaw(condition, data, connection)
  }

  public async updateRaw(condition: Readonly<Condition>, raw: Record<string, any>, connection?: Knex): Promise<boolean> {
    const queryBuilder: Knex.QueryBuilder = connection ? connection(this.table) : this.connection(this.table)

    try {
      this.conditionParser.parse(queryBuilder, condition)
      const result = await queryBuilder.update(raw)
      return result > 0
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      this.logger.error(queryBuilder.toQuery(), err.message)
      throw new Error(err.message, { cause: e })
    }
  }

  public async batchInsert(rows: Record<string, any>[], chunkSize?: number, connection?: Knex): Promise<string[] | number[] | boolean> {
    const conn = connection ?? this.connection

    const rowsNext = rows.map((row) => {
      const next: Record<string, any> = { ...row }
      delete next[this.primaryKey]
      return next
    })

    if (this.isReturningClient()) {
      const batchInsertResult: Array<string | number | Record<string, string | number>> = await conn
        .batchInsert(this.table, rowsNext, chunkSize)
        .returning(this.primaryKey)

      const ids = batchInsertResult.map((identificator) => {
        if (typeof identificator === 'object') {
          return identificator[this.primaryKey]
        }

        return identificator
      })

      return ids as string[] | number[]
    }

    return conn.batchInsert(this.table, rows, chunkSize)
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

  protected changeEntity(data: Record<string, any>, id?: string | number) {
    if (id !== undefined && this.primaryKey) {
      if (data[this.primaryKey] !== undefined) {
        Object.defineProperty(data, this.primaryKey, { value: id })
      } else {
        Object.assign(data, { [this.primaryKey]: id })
      }
    }
  }

  private isReturningClient(): boolean {
    const client = (this.connection.client as Knex.Client | undefined)?.config.client
    return typeof client === 'string' && ['pg', 'mssql', 'oracle'].includes(client)
  }
}
