import Knex from 'knex'
import { AbstractEntity } from '../../entity/AbstractEntity'
import { AbstractResource } from '../AbstractResource'
import { logger } from '../../logger/logger'
import { Condition } from '../Condition'
import { ConditionDbParser } from './condition/ConditionDbParser'
import { EntityFactory } from '../../entity/EntityFactory'
import { AbstractObject } from '../../AbstractObject'

export abstract class AbstractDBResource<T extends AbstractEntity<AbstractObject>> extends AbstractResource<T> {
  protected primaryKey = 'id'
  protected table: string = ''
  protected connection: Knex
  protected conditionParser: ConditionDbParser

  public constructor(connection: Knex, conditionParser: ConditionDbParser, entityFactory: EntityFactory<T>) {
    super(entityFactory)
    this.connection = connection
    this.conditionParser = conditionParser
  }

  public async findById(id: string) {
    const condition = new Condition([{ operator: Condition.EQUALS, field: this.primaryKey, value: id }])
    const result = await this.findOne(condition)

    if (result) {
      return result
    }

    return null
  }

  public async findOne(condition: Condition) {
    const nextCondition = condition.clone()
    nextCondition.offset(0)
    nextCondition.limit(1)
    const result = await this.findAll(nextCondition)
    if (result.length) {
      return result[0]
    }

    return null
  }

  public async findAll(condition: Condition) {
    const queryBuilder = this.connection(this.table)
    this.conditionParser.parse(queryBuilder, condition)

    let rows: any[] = []
    try {
      rows = await queryBuilder.select()
    } catch (e) {
      logger.error(e)
    }

    const result = []
    if (rows.length) {
      for (const row of rows) {
        try {
          const entity = this.createEntity(this.map(row))
          result.push(entity)
        } catch (e) {
          logger.error(e)
        }
      }
    }
    return result
  }

  public async count(condition?: Condition) {
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
        return parseInt(result[0].count)
      }

      return result[0].count
    }

    return 0
  }

  public async save(item: T) {
    try {
      const data = this.mapToDB(item)
      if (data) {
        // TODO: Is it necessary to clone data before delete id ?
        const dbData = { ...data }
        if (item.id) {
          const condition = new Condition([{ operator: Condition.EQUALS, field: this.primaryKey, value: item.id }])
          return this.update(condition, dbData)
        }

        const queryBuilder = this.connection(this.table)
        const result = await queryBuilder.insert(dbData).returning(this.primaryKey)
        if (result) {
          item.id = result[0]
        }
      }
    } catch (e) {
      logger.error(e)
      return false
    }

    return true
  }

  public async update(condition: Condition, data: AbstractObject) {
    try {
      const queryBuilder = this.connection(this.table)
      this.conditionParser.parse(queryBuilder, condition)
      const result = await queryBuilder.update(data)
      return result > 0
    } catch (e) {
      logger.error(e)
    }

    return false
  }

  public async truncate() {
    const queryBuilder = this.connection(this.table)
    try {
      return await queryBuilder.truncate()
    } catch (e) {
      logger.error(e)
    }

    return null
  }

  public async delete(id: string) {
    const condition = new Condition([{ operator: Condition.EQUALS, field: this.primaryKey, value: id }])
    return await this.deleteAll(condition)
  }

  public async deleteAll(condition?: Condition) {
    const queryBuilder = this.connection(this.table)
    this.conditionParser.parse(queryBuilder, condition)
    const response = await queryBuilder.delete()
    return response > 0
  }

  public createEntity(data: any) {
    return this.entityFactory.create(data)
  }

  protected map(data: AbstractObject): any {
    return data
  }

  protected mapToDB(item: T): any {
    return item.getData()
  }
}
