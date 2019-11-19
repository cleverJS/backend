import Knex from 'knex'
import { Condition } from '../../Condition'

interface IConditionOptions {
  limit?: number
  offset?: number
  sorts?: any[]
}

export class ConditionDbParser {
  public parse(queryBuilder: Knex.QueryBuilder, condition?: Condition) {
    if (!condition) {
      return
    }

    this.parseCondition(queryBuilder, condition)

    const options = this.options(condition)

    if (options.sorts) {
      for (const sort of options.sorts) {
        queryBuilder.orderBy(sort.sort, sort.dir)
      }
    }

    if (options.offset) {
      queryBuilder.offset(options.offset)
    }

    if (options.limit) {
      queryBuilder.limit(options.limit)
    }
  }

  protected parseCondition(queryBuilder: Knex.QueryBuilder, condition: Condition) {
    for (const cond of condition.getConditions()) {
      if (!Array.isArray(cond)) {
        continue
      }

      const condValues = Object.values(cond)
      const type = condValues.shift()

      switch (type) {
        case Condition.EQUALS:
          this.parseSimpleCondition(queryBuilder, '=', cond)
          break
        case Condition.NOT_EQUALS:
          this.parseSimpleCondition(queryBuilder, '<>', cond)
          break
        case Condition.LESS_THAN:
          this.parseSimpleCondition(queryBuilder, '<', cond)
          break
        case Condition.GREATER_THAN:
          this.parseSimpleCondition(queryBuilder, '>', cond)
          break
        case Condition.LESS_OR_EQUALS:
          this.parseSimpleCondition(queryBuilder, '<=', cond)
          break
        case Condition.GREATER_OR_EQUALS:
          this.parseSimpleCondition(queryBuilder, '>=', cond)
          break
        case Condition.BETWEEN:
          this.parseBetweenCondition(queryBuilder, cond)
          break
        case Condition.LIKE:
          this.parseLikeCondition(queryBuilder, cond)
          break
        case Condition.IN:
          this.parseInCondition(queryBuilder, cond)
          break
      }
    }
  }

  protected parseInCondition(queryBuilder: Knex.QueryBuilder, condition: any[]) {
    queryBuilder.whereIn(condition[1], condition[2])
  }

  protected parseLikeCondition(queryBuilder: Knex.QueryBuilder, condition: any[]) {
    const value = `%${condition[2]}%`
    queryBuilder.andWhere(condition[1], 'like', value)
  }

  protected parseBetweenCondition(queryBuilder: Knex.QueryBuilder, condition: any[]) {
    queryBuilder.andWhereBetween(condition[1], [condition[2][0], condition[2][1]])
  }

  protected parseSimpleCondition(queryBuilder: Knex.QueryBuilder, exr: string, condition: any[]) {
    queryBuilder.andWhere(condition[1], exr, condition[2])
  }

  protected options(condition: Condition) {
    const result: IConditionOptions = {}

    if (condition) {
      const limit = condition.getLimit()
      if (limit) {
        result.limit = limit
        const offset = condition.getOffset()
        if (offset) {
          result.offset = offset
        }
      }

      const sorts = condition.getSort()

      if (sorts.length) {
        result.sorts = sorts
      }
    }

    return result
  }
}
