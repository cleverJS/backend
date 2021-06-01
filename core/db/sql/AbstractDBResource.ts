import { Knex } from 'knex'
import { IEntity } from '../../entity/AbstractEntity'
import { AbstractResource } from '../AbstractResource'
import { Condition, TConditionOperator } from '../Condition'
import { ConditionDbParser } from './condition/ConditionDbParser'
import { IEntityFactory } from '../../entity/EntityFactory'
import { loggerNamespace } from '../../logger/logger'
import { Paginator } from '../../utils/Paginator'

export abstract class AbstractDBResource<E extends IEntity> extends AbstractResource<E> {
  protected readonly logger = loggerNamespace('AbstractDBResource')
  protected readonly connection: Knex
  protected readonly conditionParser: ConditionDbParser
  protected primaryKey = 'id'
  protected table: string = ''

  public constructor(connection: Knex, conditionParser: ConditionDbParser, entityFactory: IEntityFactory) {
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
    const rows = await this.findAllRaw(condition, pagination)
    return this.createEntityList(rows)
  }

  public async findAllRaw(condition?: Condition, pagination?: Paginator): Promise<any[]> {
    const queryBuilder: Knex.QueryBuilder = this.connection(this.table)
    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }

    if (pagination) {
      if (pagination.getLimit()) {
        queryBuilder.limit(pagination.getLimit())
      }

      if (pagination.getOffset()) {
        queryBuilder.offset(pagination.getOffset())
      }
    }

    let rows: any[] = []
    try {
      rows = await queryBuilder.select()
    } catch (e) {
      this.logger.error(e)
      throw e
    }

    return rows
  }

  public async count(condition?: Readonly<Condition>): Promise<number | null> {
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
    if (['pg', 'mssql', 'oracle'].includes(this.connection.client.config.client)) {
      result = await queryBuilder.insert(dataNext).returning(this.primaryKey)
    } else {
      result = await queryBuilder.insert(dataNext)
    }

    if (result && result.length > 0) {
      const [identificator] = result
      return identificator
    }

    return null
  }

  public async update(condition: Readonly<Condition>, data: Record<string, any>): Promise<boolean> {
    try {
      const { [this.primaryKey]: id, ...dataNext } = data

      const queryBuilder: Knex.QueryBuilder = this.connection(this.table)
      this.conditionParser.parse(queryBuilder, condition)
      const result = await queryBuilder.update(dataNext)
      return result > 0
    } catch (e) {
      this.logger.error(e)
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
      return this.connection.batchInsert(this.table, rows, chunkSize).returning(this.primaryKey)
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

  public createEntity(data: unknown): E {
    return this.entityFactory.create(data) as E
  }

  public createEntityList(rows: any[]) {
    const result: E[] = []

    rows.forEach((row) => {
      try {
        const entity = this.createEntity(this.map(row))
        result.push(entity)
      } catch (e) {
        this.logger.error(e)
        throw e
      }
    })

    return result
  }

  public map(data: Record<string, any>): any {
    if (this.primaryKey !== 'id' && data[this.primaryKey]) {
      data.id = data[this.primaryKey]
    }
    return data
  }

  public mapToDB(item: E): any {
    const { id, [this.primaryKey]: primaryKey, ...data } = item.getData()
    return data
  }
}
