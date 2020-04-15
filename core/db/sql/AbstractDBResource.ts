import Knex from 'knex'
import { AbstractEntity } from '../../entity/AbstractEntity'
import { AbstractResource } from '../AbstractResource'
import { logger } from '../../logger/logger'
import { Condition, TConditionOperator } from '../Condition'
import { ConditionDbParser } from './condition/ConditionDbParser'
import { EntityFactory } from '../../entity/EntityFactory'

export abstract class AbstractDBResource<T extends AbstractEntity<Record<string, any>>> extends AbstractResource<T> {
  protected primaryKey = 'id'
  protected table: string = ''
  protected connection: Knex
  protected conditionParser: ConditionDbParser

  public constructor(connection: Knex, conditionParser: ConditionDbParser, entityFactory: EntityFactory<T>) {
    super(entityFactory)
    this.connection = connection
    this.conditionParser = conditionParser
  }

  public findById(id: string): Promise<T | null> {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
    return this.findOne(condition)
  }

  public async findOne(condition: Condition): Promise<T | null> {
    const nextCondition = condition.clone()
    nextCondition.offset(0)
    nextCondition.limit(1)
    const result = await this.findAll(nextCondition)
    if (result.length) {
      return result[0]
    }

    return null
  }

  public async findAll(condition?: Condition): Promise<T[]> {
    const rows = await this.findAllRaw(condition)
    return this.createEntityList(rows)
  }

  public async findAllRaw(condition?: Condition) {
    const queryBuilder = this.connection(this.table)
    if (condition) {
      this.conditionParser.parse(queryBuilder, condition)
    }

    let rows: any[] = []
    try {
      rows = await queryBuilder.select()
    } catch (e) {
      logger.error(e)
      throw e
    }

    return rows
  }

  public async count(condition?: Condition): Promise<number | null> {
    let conditionClone: Condition | undefined
    if (condition) {
      conditionClone = condition.clone()
      conditionClone.clearSort()
      conditionClone.offset(undefined)
      conditionClone.limit(undefined)
    }
    const queryBuilder = this.connection(this.table)
    this.conditionParser.parse(queryBuilder, conditionClone)
    const result = await queryBuilder.count('* as count')
    if (result) {
      if (typeof result[0].count === 'string') {
        return parseInt(result[0].count, 10)
      }

      return result[0].count
    }

    return 0
  }

  public async save(item: T) {
    try {
      const data = this.mapToDB(item)
      if (data) {
        delete data[this.primaryKey]
        if (item.id) {
          const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: item.id }] })
          return this.update(condition, data)
        }

        const queryBuilder = this.connection(this.table)
        const result = await queryBuilder.insert(data).returning(this.primaryKey)
        if (result && result.length > 0) {
          const [id] = result
          item.id = id
        }
      }
    } catch (e) {
      logger.error(e)
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

  public async update(condition: Condition, data: Record<string, any>) {
    try {
      const queryBuilder = this.connection(this.table)
      this.conditionParser.parse(queryBuilder, condition)
      const result = await queryBuilder.update(data)
      return result > 0
    } catch (e) {
      logger.error(e)
      throw e
    }
  }

  public async truncate() {
    const queryBuilder = this.connection(this.table)
    let result
    try {
      result = await queryBuilder.truncate()
    } catch (e) {
      logger.error(e)
      throw e
    }

    return result
  }

  public delete(id: string) {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.EQUALS, field: this.primaryKey, value: id }] })
    return this.deleteAll(condition)
  }

  public async deleteAll(condition?: Condition) {
    const queryBuilder = this.connection(this.table)
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
          logger.error(e)
          throw e
        }
      }
    }
    return result
  }

  public map(data: Record<string, any>): any {
    return data
  }

  public mapToDB(item: T): any {
    return item.getData()
  }
}
