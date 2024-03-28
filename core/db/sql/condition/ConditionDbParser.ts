import { Knex } from 'knex'

import { loggerNamespace } from '../../../logger/logger'
import { isInstanceOf } from '../../../utils/common'
import {
  Condition,
  conditionOperatorNames,
  IConditionItem,
  IConditionItemList,
  TConditionBetween,
  TConditionIN,
  TConditionLike,
  TConditionLogic,
  TConditionNull,
  TConditionOperator,
  TConditionSimple,
} from '../../Condition'
import { ErrorCondition } from '../../errors/ErrorCondition'

interface IConditionOptions {
  sorts?: any[]
}

export class ConditionDbParser {
  protected static instance: ConditionDbParser
  protected readonly logger = loggerNamespace('ConditionDbParser')

  protected constructor() {}

  public static getInstance(): ConditionDbParser {
    if (!ConditionDbParser.instance) {
      ConditionDbParser.instance = new ConditionDbParser()
    }

    return ConditionDbParser.instance
  }

  public parse(queryBuilder: Knex.QueryBuilder, condition?: Readonly<Condition>): void {
    if (!condition) {
      return
    }

    const conditionItemList = condition.getConditionItemList()
    if (conditionItemList) {
      this.parseConditionItemList(queryBuilder, conditionItemList)
    }

    const options = this.options(condition)

    if (options.sorts) {
      for (const sort of options.sorts) {
        queryBuilder.orderBy(sort.sort, sort.dir)
      }
    }
  }

  protected parseConditionItemList(
    queryBuilder: Knex.QueryBuilder,
    conditionItemList: IConditionItemList,
    itemListLogic: TConditionLogic = 'and'
  ): void {
    const logic: TConditionLogic = itemListLogic || conditionItemList.logic
    if (conditionItemList) {
      if (logic === 'and') {
        queryBuilder.andWhere((query) => {
          this.parseConditions(query, conditionItemList)
        })
      }

      if (logic === 'or') {
        queryBuilder.orWhere((query) => {
          this.parseConditions(query, conditionItemList)
        })
      }
    }
  }

  protected parseConditions(queryBuilder: Knex.QueryBuilder, conditionItemList: IConditionItemList): void {
    for (const cond of conditionItemList.conditions) {
      if (isInstanceOf<IConditionItemList>(cond, 'conditions')) {
        this.parseConditionItemList(queryBuilder, cond, conditionItemList.logic)
      } else {
        this.parseCondition(queryBuilder, cond, conditionItemList.logic)
      }
    }
  }

  protected parseCondition(queryBuilder: Knex.QueryBuilder, condition: IConditionItem, logic: TConditionLogic = 'and'): void {
    switch (condition.operator) {
      case TConditionOperator.EQUALS:
        this.parseSimpleCondition(queryBuilder, '=', condition, logic)
        break
      case TConditionOperator.NOT_EQUALS:
        this.parseSimpleCondition(queryBuilder, '<>', condition, logic)
        break
      case TConditionOperator.LESS_THAN:
        this.parseSimpleCondition(queryBuilder, '<', condition, logic)
        break
      case TConditionOperator.GREATER_THAN:
        this.parseSimpleCondition(queryBuilder, '>', condition, logic)
        break
      case TConditionOperator.LESS_OR_EQUALS:
        this.parseSimpleCondition(queryBuilder, '<=', condition, logic)
        break
      case TConditionOperator.GREATER_OR_EQUALS:
        this.parseSimpleCondition(queryBuilder, '>=', condition, logic)
        break
      case TConditionOperator.BETWEEN:
        this.parseBetweenCondition(queryBuilder, condition, logic)
        break
      case TConditionOperator.NOT_BETWEEN:
        this.parseNotBetweenCondition(queryBuilder, condition, logic)
        break
      case TConditionOperator.LIKE:
        this.parseLikeCondition(queryBuilder, condition, logic)
        break
      case TConditionOperator.ILIKE:
        this.parseILikeCondition(queryBuilder, condition, logic)
        break
      case TConditionOperator.NOT_LIKE:
        this.parseNotLikeCondition(queryBuilder, condition, logic)
        break
      case TConditionOperator.IN:
        this.parseInCondition(queryBuilder, condition, logic)
        break
      case TConditionOperator.NOT_IN:
        this.parseNotInCondition(queryBuilder, condition, logic)
        break
      case TConditionOperator.IS_NULL:
        this.parseNullCondition(queryBuilder, condition, logic)
        break
      case TConditionOperator.IS_NOT_NULL:
        this.parseIsNotNullCondition(queryBuilder, condition, logic)
        break
      default:
        throw new Error('Unknown operator')
    }
  }

  protected parseInCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionIN, logic: TConditionLogic): void {
    if (Array.isArray(condition.value)) {
      if (logic === 'and') {
        queryBuilder.whereIn(condition.field, condition.value)
      } else {
        queryBuilder.orWhereIn(condition.field, condition.value)
      }
    }
  }

  protected parseNotInCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionIN, logic: TConditionLogic): void {
    if (Array.isArray(condition.value)) {
      if (logic === 'and') {
        queryBuilder.whereNotIn(condition.field, condition.value)
      } else {
        queryBuilder.orWhereNotIn(condition.field, condition.value)
      }
    }
  }

  protected parseLikeCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionLike, logic: TConditionLogic): void {
    const { value, field } = condition

    if (typeof value !== 'string') {
      throw new ErrorCondition(`Value should be a string in ${conditionOperatorNames[condition.operator]} condition. Actual ${value}`)
    }

    if (value === '') {
      throw new ErrorCondition(`${conditionOperatorNames[condition.operator]} cannot have empty value`)
    }

    if (logic === 'and') {
      queryBuilder.andWhereLike(field, value)
    } else {
      queryBuilder.orWhereLike(field, value)
    }
  }

  protected parseILikeCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionLike, logic: TConditionLogic): void {
    const { value, field } = condition

    if (typeof value !== 'string') {
      throw new ErrorCondition(`Value should be a string in ${conditionOperatorNames[condition.operator]} condition. Actual ${value}`)
    }

    if (value === '') {
      throw new ErrorCondition(`${conditionOperatorNames[condition.operator]} cannot have empty value`)
    }

    if (logic === 'and') {
      queryBuilder.andWhereILike(field, value)
    } else {
      queryBuilder.orWhereILike(field, value)
    }
  }

  protected parseNotLikeCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionLike, logic: TConditionLogic): void {
    const { value, field } = condition

    if (typeof value !== 'string') {
      throw new ErrorCondition(`Value should be a string in ${conditionOperatorNames[condition.operator]} condition. Actual ${value}`)
    }

    if (value === '') {
      throw new ErrorCondition(`${conditionOperatorNames[condition.operator]} cannot have empty value`)
    }

    if (logic === 'and') {
      queryBuilder.andWhere(field, 'not like', value)
    } else {
      queryBuilder.orWhere(field, 'not like', value)
    }
  }

  protected parseBetweenCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionBetween, logic: TConditionLogic): void {
    if (Array.isArray(condition.value)) {
      if (logic === 'and') {
        queryBuilder.andWhereBetween(condition.field, [condition.value[0], condition.value[1]])
      } else {
        queryBuilder.orWhereBetween(condition.field, [condition.value[0], condition.value[1]])
      }
    }
  }

  protected parseNotBetweenCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionBetween, logic: TConditionLogic): void {
    if (Array.isArray(condition.value)) {
      if (logic === 'and') {
        queryBuilder.andWhereNotBetween(condition.field, [condition.value[0], condition.value[1]])
      } else {
        queryBuilder.orWhereNotBetween(condition.field, [condition.value[0], condition.value[1]])
      }
    }
  }

  protected parseSimpleCondition(queryBuilder: Knex.QueryBuilder, exr: string, condition: TConditionSimple, logic: TConditionLogic): void {
    const { value, field } = condition

    if (value === undefined || value === null) {
      throw new ErrorCondition(`${conditionOperatorNames[condition.operator]} cannot have NULL or undefined value`)
    }

    if (logic === 'and') {
      queryBuilder.andWhere(field, exr, value)
    } else {
      queryBuilder.orWhere(field, exr, value)
    }
  }

  protected parseNullCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionNull, logic: TConditionLogic): void {
    if (logic === 'and') {
      queryBuilder.whereNull(condition.field)
    } else {
      queryBuilder.orWhereNull(condition.field)
    }
  }

  protected parseIsNotNullCondition(queryBuilder: Knex.QueryBuilder, condition: TConditionNull, logic: TConditionLogic): void {
    if (logic === 'and') {
      queryBuilder.whereNotNull(condition.field)
    } else {
      queryBuilder.orWhereNotNull(condition.field)
    }
  }

  protected options(condition: Readonly<Condition>): IConditionOptions {
    const result: IConditionOptions = {}

    if (condition) {
      const sorts = condition.getSort()

      if (sorts.length) {
        result.sorts = sorts
      }
    }

    return result
  }
}
