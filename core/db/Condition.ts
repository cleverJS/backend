type TOperator = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9
type TSortDirection = 'asc' | 'desc'

interface ICondition {
  operator: TOperator
  field: string
  value: string | number | string[] | number[]
}

export class Condition {
  public static EQUALS: TOperator = 1
  public static NOT_EQUALS: TOperator = 2
  public static LESS_THAN: TOperator = 3
  public static GREATER_THAN: TOperator = 4
  public static LESS_OR_EQUALS: TOperator = 5
  public static GREATER_OR_EQUALS: TOperator = 6
  public static BETWEEN: TOperator = 7
  public static LIKE: TOperator = 8
  public static IN: TOperator = 9

  protected initialConditions: ICondition[] = []
  protected conditions: any[] = []
  protected sort: {sort: string, dir: TSortDirection}[] = []
  protected offsetValue?: number
  protected limitValue?: number

  constructor(conditions: ICondition[] = [], offset?: number, limit?: number, sort?: string, dir?: TSortDirection) {
    this.initialConditions = conditions
    const parsedConditions = Condition.parseCondition(conditions)
    if (parsedConditions) {
      this.conditions = parsedConditions
    }

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

  public addEqualsCondition(field: string, value: string | number) {
    this.conditions.push([Condition.EQUALS, field, value])
    return this
  }

  public addNotEqualsCondition(field: string, value: string | number) {
    this.conditions.push([Condition.NOT_EQUALS, field, value])
    return this
  }

  public addLessThanCondition(field: string, value: string | number) {
    this.conditions.push([Condition.LESS_THAN, field, value])
    return this
  }

  public addGreaterThanCondition(field: string, value: string | number) {
    this.conditions.push([Condition.GREATER_THAN, field, value])
    return this
  }

  public addLessOrEqualsCondition(field: string, value: string | number) {
    this.conditions.push([Condition.LESS_OR_EQUALS, field, value])
    return this
  }

  public addGreaterOrEqualsCondition(field: string, value: string | number) {
    this.conditions.push([Condition.GREATER_OR_EQUALS, field, value])
    return this
  }

  public addBetweenCondition(field: string, valueFrom: string | number, valueTo: string | number) {
    this.conditions.push([Condition.BETWEEN, field, [valueFrom, valueTo]])
    return this
  }

  public addLikeCondition(field: string, value: any) {
    this.conditions.push([Condition.LIKE, field, value])
    return this
  }

  public addInCondition(field: string, array: any[]) {
    this.conditions.push([Condition.IN, field, array])
    return this
  }

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

  public getConditions() {
    return this.conditions
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
    const condition = new Condition([...this.initialConditions], this.offsetValue, this.limitValue)

    if (this.sort.length) {
      this.sort.forEach(s => {
        condition.addSort(s.sort, s.dir)
      })
    }

    return condition
  }

  protected static parseCondition(conditions: ICondition[]) {
    const result = []
    if (Array.isArray(conditions)) {
      for (const condition of conditions) {
        const o = condition.operator
        const f = condition.field
        const v = condition.value

        result.push([o, f, v])
      }
    }

    return result
  }
}
