import { types } from 'util'
import { Knex } from 'knex'
import { IEntity } from '../../entity/AbstractEntity'
import { AbstractResource } from '../AbstractResource'
import { Condition, TConditionOperator } from '../Condition'
import { ConditionDbParser } from './condition/ConditionDbParser'
import { IEntityFactory } from '../../entity/EntityFactory'
import { loggerNamespace } from '../../logger/logger'
import { Paginator } from '../../utils/Paginator'
import { TEntityFrom } from '../../utils/types'

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
    return this.createEntityList(rows, false)
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

    if (pagination) {
      if (!condition) {
        condition = new Condition(undefined, this.primaryKey, 'asc')
      } else if (condition.getSort().length === 0) {
        condition = condition.clone()
        condition.setSort(this.primaryKey, 'asc')
      }

      if (pagination.getLimit()) {
        queryBuilder.limit(pagination.getLimit())
      }

      if (pagination.getOffset()) {
        queryBuilder.offset(pagination.getOffset())
      }
    }

    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }

    let rows: T[] = []
    try {
      rows = await queryBuilder.select()
    } catch (e) {
      if (types.isNativeError(e)) {
        this.logger.error(e.message, queryBuilder.toQuery())
      }

      throw e
    }

    return rows
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
    try {
      const data = this.mapToDB(item)
      if (data) {
        const { id } = item
        if (id) {
          const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
          return this.update(condition, data)
        }

        item.id = await this.insert(data)
      }
    } catch (e) {
      this.logger.error(e)
      throw e
    }

    return true
  }

  public async insert(data: Record<string, any>): Promise<any | null> {
    const { [this.primaryKey]: id, ...dataNext } = data

    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)
    let result

    try {
      if (['pg', 'mssql', 'oracle'].includes(this.connection.client.config.client)) {
        result = await queryBuilder.insert(dataNext).returning(this.primaryKey)
      } else {
        result = await queryBuilder.insert(dataNext)
      }

      if (result && result.length > 0) {
        let [identificator] = result

        if (typeof identificator === 'object') {
          identificator = identificator[this.primaryKey]
        }

        return identificator
      }
    } catch (e) {
      if (types.isNativeError(e)) {
        this.logger.error(e.message, queryBuilder.toQuery())
      }

      throw e
    }

    return null
  }

  public async update(condition: Readonly<Condition>, data: Record<string, any>): Promise<boolean> {
    const { [this.primaryKey]: id, ...dataNext } = data
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)

    try {
      this.conditionParser.parse(queryBuilder, condition)
      const result = await queryBuilder.update(dataNext)
      return result > 0
    } catch (e) {
      if (types.isNativeError(e)) {
        this.logger.error(e.message, queryBuilder.toQuery())
      }

      throw e
    }
  }

  public async batchInsert(items: E[], chunkSize?: number): Promise<string[] | number[] | any> {
    const rows = items.map((i) => {
      const data = this.mapToDB(i)
      const { [this.primaryKey]: id, ...dataNext } = data
      return dataNext
    })

    return this.batchInsertRaw(rows, chunkSize)
  }

  public async batchInsertRaw(rows: Record<string, any>[], chunkSize?: number): Promise<string[] | number[] | any> {
    if (['pg', 'mssql', 'oracle'].includes(this.connection.client.config.client)) {
      const result = await this.connection.batchInsert(this.table, rows, chunkSize).returning(this.primaryKey)

      return result.map((identificator) => {
        if (typeof identificator === 'object') {
          return identificator[this.primaryKey]
        }

        return identificator
      })
    }

    return this.connection.batchInsert(this.table, rows, chunkSize)
  }

  public async truncate() {
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)
    let result
    try {
      result = await queryBuilder.truncate()
    } catch (e) {
      this.logger.error(e)
      throw e
    }

    return result
  }

  public delete(id: string | number) {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
    return this.deleteAll(condition)
  }

  public async deleteAll(condition?: Condition) {
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)
    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }
    const response = await queryBuilder.delete()
    return response > 0
  }

  public createEntity(data: Partial<TEntityFrom<E>>, clone: boolean = true): Promise<E> {
    return <Promise<E>>this.entityFactory.create(data, clone)
  }

  public async createEntityList(rows: Partial<TEntityFrom<E>>[], clone: boolean = true) {
    let result: Promise<E>[] = []

    try {
      for (const row of rows) {
        const entity = this.createEntity(this.map(row), clone)
        result.push(entity)
      }
    } catch (e) {
      this.logger.warn('createEntityList was interrupted because validation unsatisfying record was received')
      result = []
    }

    return Promise.all(result)
  }

  public map(data: Record<string, any>): any {
    if (this.primaryKey !== 'id' && data[this.primaryKey]) {
      data.id = data[this.primaryKey]
    }

    return data
  }

  public mapToDB(item: E): any {
    const { id, [this.primaryKey]: primaryKey, ...data } = item.getData(false)
    return data
  }
}
