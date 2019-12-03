import { ConditionDepricated } from '../../ConditionDepricated'

interface IConditionOptions {
  limit?: number
  offset?: number
  sorts?: any[]
}

export class ConditionMongoDbParser {
  protected condition?: ConditionDepricated

  constructor(condition?: ConditionDepricated) {
    this.condition = condition
  }

  public filter() {
    const result: any = {}

    if (this.condition) {
      const conditions = this.condition.getConditions()

      for (const cond of conditions) {
        if (!Array.isArray(cond)) {
          continue
        }

        const condValues = Object.values(cond)
        const type = condValues.shift()

        switch (type) {
          case ConditionDepricated.EQUALS:
            result[condValues[0]] = Array.isArray(condValues[1]) ? { $in: condValues[1] } : condValues[1]
            break
          case ConditionDepricated.NOT_EQUALS:
            result[condValues[0]] = Array.isArray(condValues[1]) ? { $nin: condValues[1] } : { $ne: condValues[1] }
            break
          case ConditionDepricated.LESS_THAN:
            result[condValues[0]] = { $lt: condValues[1] }
            break
          case ConditionDepricated.GREATER_THAN:
            result[condValues[0]] = { $gt: condValues[1] }
            break
          case ConditionDepricated.LESS_OR_EQUALS:
            result[condValues[0]] = { $lte: condValues[1] }
            break
          case ConditionDepricated.GREATER_OR_EQUALS:
            result[condValues[0]] = { $gte: condValues[1] }
            break
          case ConditionDepricated.BETWEEN:
            result[condValues[0]] = {
              $gte: condValues[1][0],
              $lte: condValues[1][1],
            }
            break
          case ConditionDepricated.LIKE:
            result[condValues[0]] = { $regex: condValues[1], $options: 'i' }
            break
          case ConditionDepricated.IN:
            result[condValues[0]] = { $in: Object.values(condValues[1]) }
            break
        }
      }
    }

    return result
  }

  public options() {
    const result: IConditionOptions = {}

    if (this.condition) {
      const limit = this.condition.getLimit()
      if (limit) {
        result.limit = limit
        const offset = this.condition.getOffset()
        if (offset) {
          result.offset = offset
        }
      }

      const sorts = this.condition.getSort()

      if (sorts.length) {
        result.sorts = sorts
      }
    }

    return result
  }
}
