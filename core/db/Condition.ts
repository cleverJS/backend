export enum TConditionOperator {
  EQUALS,
  NOT_EQUALS,
  LESS_THAN,
  GREATER_THAN,
  LESS_OR_EQUALS,
  GREATER_OR_EQUALS,
  BETWEEN,
  LIKE,
  IN,
}
type TSortDirection = 'asc' | 'desc'
export type TConditionLogic = 'and' | 'or'

export interface IConditionItemList {
  logic?: TConditionLogic
  conditions: (IConditionItem | IConditionItemList)[]
}

export interface IConditionItem {
  operator: TConditionOperator
  field: string
  value: string | number | string[] | number[]
}

export class Condition {
  protected conditionItemList?: IConditionItemList
  protected sort: {sort: string, dir: TSortDirection}[] = []
  protected offsetValue?: number
  protected limitValue?: number

  constructor(conditionItemList?: IConditionItemList, offset?: number, limit?: number, sort?: string, dir?: TSortDirection) {
    this.conditionItemList = conditionItemList

    if (sort && dir) {
      this.addSort(sort, dir)
    }

    if (offset) {
      this.offset(offset)
    }

    if (limit) {
      this.limit(limit)
    }
  }
  //
  // public addEqualsCondition(field: string, value: string | number) {
  //   this.conditions.push([Condition.EQUALS, field, value])
  //   return this
  // }
  //
  // public addNotEqualsCondition(field: string, value: string | number) {
  //   this.conditions.push([Condition.NOT_EQUALS, field, value])
  //   return this
  // }
  //
  // public addLessThanCondition(field: string, value: string | number) {
  //   this.conditions.push([Condition.LESS_THAN, field, value])
  //   return this
  // }
  //
  // public addGreaterThanCondition(field: string, value: string | number) {
  //   this.conditions.push([Condition.GREATER_THAN, field, value])
  //   return this
  // }
  //
  // public addLessOrEqualsCondition(field: string, value: string | number) {
  //   this.conditions.push([Condition.LESS_OR_EQUALS, field, value])
  //   return this
  // }
  //
  // public addGreaterOrEqualsCondition(field: string, value: string | number) {
  //   this.conditions.push([Condition.GREATER_OR_EQUALS, field, value])
  //   return this
  // }
  //
  // public addBetweenCondition(field: string, valueFrom: string | number, valueTo: string | number) {
  //   this.conditions.push([Condition.BETWEEN, field, [valueFrom, valueTo]])
  //   return this
  // }
  //
  // public addLikeCondition(field: string, value: any) {
  //   this.conditions.push([Condition.LIKE, field, value])
  //   return this
  // }
  //
  // public addInCondition(field: string, array: any[]) {
  //   this.conditions.push([Condition.IN, field, array])
  //   return this
  // }

  public addSort(sort: string, dir: TSortDirection) {
    this.sort.push({ sort, dir })
    return this
  }

  public setSort(sort: string, dir: TSortDirection) {
    this.sort = []
    return this.addSort(sort, dir)
  }

  public clearSort() {
    this.sort = []
  }

  public offset(value?: number) {
    this.offsetValue = value
    return this
  }

  public limit(value?: number) {
    this.limitValue = value
    return this
  }

  public getConditionItemList() {
    return this.conditionItemList
  }

  public getSort() {
    return this.sort
  }

  public getOffset() {
    return this.offsetValue
  }

  public getLimit() {
    return this.limitValue
  }

  public clone() {
    // const conditionData: IConditionItem[] = []
    // for (const value of this.getConditions()) {
    //   conditionData.push({ operator: value[0], field: value[1], value: value[2] })
    // }
    //
    // const condition = new Condition(conditionData, this.offsetValue, this.limitValue)
    //
    // if (this.sort.length) {
    //   this.sort.forEach(s => {
    //     condition.addSort(s.sort, s.dir)
    //   })
    // }
    //
    // return condition
    return this
  }
}
