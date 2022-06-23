export enum TConditionOperator {
  EQUALS,
  NOT_EQUALS,
  LESS_THAN,
  GREATER_THAN,
  LESS_OR_EQUALS,
  GREATER_OR_EQUALS,
  BETWEEN,
  NOT_BETWEEN,
  LIKE,
  NOT_LIKE,
  IN,
  NOT_IN,
  IS_NULL,
  IS_NOT_NULL,
}

export const conditionOperatorNames = {
  0: 'EQUALS',
  1: 'NOT_EQUALS',
  2: 'LESS_THAN',
  3: 'GREATER_THAN',
  4: 'LESS_OR_EQUALS',
  5: 'GREATER_OR_EQUALS',
  6: 'BETWEEN',
  7: 'NOT_BETWEEN',
  8: 'LIKE',
  9: 'NOT_LIKE',
  10: 'IN',
  11: 'NOT_IN',
  12: 'IS_NULL',
  13: 'IS_NOT_NULL',
}

export type TSortDirection = 'asc' | 'desc'
export type TConditionLogic = 'and' | 'or'

export interface IConditionItemList {
  logic?: TConditionLogic
  conditions: (IConditionItem | IConditionItemList)[]
}

export type TConditionSimple = {
  operator:
    | TConditionOperator.EQUALS
    | TConditionOperator.NOT_EQUALS
    | TConditionOperator.LESS_THAN
    | TConditionOperator.GREATER_THAN
    | TConditionOperator.LESS_OR_EQUALS
    | TConditionOperator.GREATER_OR_EQUALS
  field: string
  value: string | number | Date
}

export type TConditionBetween = {
  operator: TConditionOperator.BETWEEN | TConditionOperator.NOT_BETWEEN
  field: string
  value: string[] | number[] | Date[]
}

export type TConditionIN = {
  operator: TConditionOperator.IN | TConditionOperator.NOT_IN
  field: string
  value: string[] | number[]
}

export type TConditionLike = {
  operator: TConditionOperator.LIKE | TConditionOperator.NOT_LIKE
  field: string
  value: string | number | Date
}

export type TConditionNull = {
  operator: TConditionOperator.IS_NULL | TConditionOperator.IS_NOT_NULL
  field: string
}

export type IConditionItem = TConditionSimple | TConditionBetween | TConditionIN | TConditionLike | TConditionNull

export class Condition {
  protected conditionItemList?: IConditionItemList
  protected sort: { sort: string; dir: TSortDirection }[] = []

  constructor(conditionItemList?: IConditionItemList, sort?: string, dir?: TSortDirection) {
    this.conditionItemList = conditionItemList

    if (sort && dir) {
      this.addSort(sort, dir)
    }
  }

  public addSort(sort: string, dir: TSortDirection = 'asc') {
    this.sort.push({ sort, dir })
    return this
  }

  public setSort(sort: string, dir: TSortDirection = 'asc') {
    this.sort = []
    return this.addSort(sort, dir)
  }

  public clearSort() {
    this.sort = []
  }

  public getConditionItemList() {
    return this.conditionItemList
  }

  public getSort() {
    return this.sort
  }

  public addCondition(conditionItemList: IConditionItemList, logic: TConditionLogic = 'and') {
    if (this.conditionItemList) {
      this.conditionItemList = {
        logic,
        conditions: [this.conditionItemList, conditionItemList],
      }
    } else {
      this.conditionItemList = {
        logic,
        conditions: [conditionItemList],
      }
    }
  }

  public clone() {
    const condition = new Condition(this.conditionItemList)

    if (this.sort.length) {
      this.sort.forEach((s) => {
        condition.addSort(s.sort, s.dir)
      })
    }

    return condition
  }
}
