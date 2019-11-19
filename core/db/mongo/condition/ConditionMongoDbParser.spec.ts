import { Condition } from '../../Condition'
import { ConditionMongoDbParser } from './ConditionMongoDbParser'

describe('Test Conditions', () => {
  it('should create a condition', () => {
    const condition = new Condition()
    condition.addEqualsCondition('a', 1)
    condition.addNotEqualsCondition('b', 2)
    condition.addLessThanCondition('c', 3)
    condition.addGreaterThanCondition('d', 4)
    condition.addLessOrEqualsCondition('e', 5)
    condition.addGreaterOrEqualsCondition('f', 6)
    condition.addBetweenCondition('g', 7, 8)
    condition.addInCondition('h', [9, 10])
    condition.addLikeCondition('i', 'asd')
    condition.addSort('s1', 'asc')
    condition.addSort('s2', 'desc')
    condition.offset(5)
    condition.limit(15)

    const parser = new ConditionMongoDbParser(condition)
    expect({
      a: 1,
      b: { $ne: 2 },
      c: { $lt: 3 },
      d: { $gt: 4 },
      e: { $lte: 5 },
      f: { $gte: 6 },
      g: { $gte: 7, $lte: 8 },
      h: { $in: [9, 10] },
      i: { $regex: 'asd', $options: 'i' },
    }).toEqual(parser.filter())

    expect({
      limit: 15,
      offset: 5,
      sorts: [{ sort: 's1', dir: 'asc' }, { sort: 's2', dir: 'desc' }],
    }).toEqual(parser.options())
  })
})
