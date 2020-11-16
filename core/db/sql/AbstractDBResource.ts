import Knex, { QueryBuilder } from 'knex'
import { AbstractEntity } from '../../entity/AbstractEntity'
import { AbstractResource } from '../AbstractResource'
import { Condition, TConditionOperator } from '../Condition'
import { ConditionDbParser } from './condition/ConditionDbParser'
import { EntityFactory } from '../../entity/EntityFactory'
import { loggerNamespace } from '../../logger/logger'
import { Paginator } from '../../utils/Paginator'

export abstract class AbstractDBResource<T extends AbstractEntity<Record<string, any>>> extends AbstractResource<T> {
  protected readonly logger = loggerNamespace('AbstractDBResource')
  protected readonly connection: Knex
  protected readonly conditionParser: ConditionDbParser
  protected primaryKey = 'id'
  protected table: string = ''

  public constructor(connection: Knex, conditionParser: ConditionDbParser, entityFactory: EntityFactory<T>) {
    super(entityFactory)
    this.connection = connection
    this.conditionParser = conditionParser
  }

  public findById(id: string | number): Promise<T | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
    return this.findOne(condition)
  }

  public async findOne(condition: Condition): Promise<T | null> {
    const paginator = new Paginator()
    paginator.setItemsPerPage(1)

    const result = await this.findAll(condition, paginator)
    if (result.length) {
      return result[0]
    }

    return null
  }

  public async findAll(condition?: Condition, pagination?: Paginator): Promise<T[]> {
    const rows = await this.findAllRaw(condition, pagination)
    return this.createEntityList(rows)
  }

  public async findAllRaw(condition?: Condition, pagination?: Paginator): Promise<any[]> {
    const queryBuilder: QueryBuilder = this.connection(this.table)
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
    const queryBuilder: QueryBuilder = this.connection(this.table)
    this.conditionParser.parse(queryBuilder, conditionClone)
    const result = await queryBuilder.count<{ count: number }[]>('* as count')
    if (result && result.length) {
      return result[0].count
    }

    return 0
  }

  public async save(item: T) {
    try {
      const data = this.mapToDB(item)
      if (data) {
        delete data[this.primaryKey]
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

  public batchInsert(items: T[]) {
    const rows = items.map((i) => {
      const data = this.mapToDB(i)
      delete data[this.primaryKey]
      return data
    })

    return this.connection.batchInsert(this.table, rows).returning(this.primaryKey)
  }

  public batchInsertRaw(rows: Record<string, any>[]) {
    return this.connection.batchInsert(this.table, rows).returning(this.primaryKey)
  }

  public async insert(data: Record<string, any>): Promise<any | null> {
    const queryBuilder: QueryBuilder = this.connection(this.table)
    const result = await queryBuilder.insert(data).returning(this.primaryKey)
    if (result && result.length > 0) {
      const [identificator] = result
      return identificator
    }

    return null
  }

  public async update(condition: Readonly<Condition>, data: Record<string, any>): Promise<boolean> {
    try {
      const queryBuilder: QueryBuilder = this.connection(this.table)
      this.conditionParser.parse(queryBuilder, condition)
      const result = await queryBuilder.update(data)
      return result > 0
    } catch (e) {
      this.logger.error(e)
      throw e
    }
  }

  public async truncate() {
    const queryBuilder: QueryBuilder = this.connection(this.table)
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
    const queryBuilder: QueryBuilder = this.connection(this.table)
    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }
    const response = await queryBuilder.delete()
    return response > 0
  }

  public createEntity(data: any) {
    return this.entityFactory.create(data)
  }

  public createEntityList(rows: any[]) {
    const result = []
    if (rows.length) {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[parseInt(`${i}`, 10)]
        try {
          const entity = this.createEntity(this.map(row))
          result.push(entity)
        } catch (e) {
          this.logger.error(e)
          throw e
        }
      }
    }
    return result
  }

  public map(data: Record<string, any>): any {
    if (this.primaryKey !== 'id' && data[this.primaryKey]) {
      data.id = data[this.primaryKey]
    }
    return data
  }

  public mapToDB(item: T): any {
    const { id, ...data } = item.getData()
    return data
  }
}
