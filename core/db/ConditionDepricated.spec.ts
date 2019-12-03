import { ConditionDepricated } from './ConditionDepricated'

describe('Test Conditions', () => {
  it('should create a condition', () => {
    const condition = new ConditionDepricated()
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

    expect(15).toEqual(condition.getLimit())
    expect(5).toEqual(condition.getOffset())
    expect([{ sort: 's1', dir: 'asc' }, { sort: 's2', dir: 'desc' }]).toEqual(condition.getSort())

    expect([
      [ConditionDepricated.EQUALS, 'a', 1],
      [ConditionDepricated.NOT_EQUALS, 'b', 2],
      [ConditionDepricated.LESS_THAN, 'c', 3],
      [ConditionDepricated.GREATER_THAN, 'd', 4],
      [ConditionDepricated.LESS_OR_EQUALS, 'e', 5],
      [ConditionDepricated.GREATER_OR_EQUALS, 'f', 6],
      [ConditionDepricated.BETWEEN, 'g', [7, 8]],
      [ConditionDepricated.IN, 'h', [9, 10]],
      [ConditionDepricated.LIKE, 'i', 'asd'],
    ]).toEqual(condition.getConditions())
  })
})

describe('Test Conditions Arguments', () => {
  it('should create a condition', () => {
    const condition = new ConditionDepricated([
      { operator: ConditionDepricated.EQUALS, field: 'a', value: 1 },
      { operator: ConditionDepricated.NOT_EQUALS, field: 'b', value: 2 },
      { operator: ConditionDepricated.LESS_THAN, field: 'c', value: 3 },
      { operator: ConditionDepricated.GREATER_THAN, field: 'd', value: 4 },
      { operator: ConditionDepricated.LESS_OR_EQUALS, field: 'e', value: 5 },
      { operator: ConditionDepricated.GREATER_OR_EQUALS, field: 'f', value: 6 },
      { operator: ConditionDepricated.BETWEEN, field: 'g', value: [7, 8] },
      { operator: ConditionDepricated.IN, field: 'h', value: [9, 10] },
      { operator: ConditionDepricated.LIKE, field: 'i', value: 'asd' },
    ])

    expect([
      [ConditionDepricated.EQUALS, 'a', 1],
      [ConditionDepricated.NOT_EQUALS, 'b', 2],
      [ConditionDepricated.LESS_THAN, 'c', 3],
      [ConditionDepricated.GREATER_THAN, 'd', 4],
      [ConditionDepricated.LESS_OR_EQUALS, 'e', 5],
      [ConditionDepricated.GREATER_OR_EQUALS, 'f', 6],
      [ConditionDepricated.BETWEEN, 'g', [7, 8]],
      [ConditionDepricated.IN, 'h', [9, 10]],
      [ConditionDepricated.LIKE, 'i', 'asd'],
    ]).toEqual(condition.getConditions())
  })
})
