import { Condition } from './Condition'

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

    expect(15).toEqual(condition.getLimit())
    expect(5).toEqual(condition.getOffset())
    expect([{ sort: 's1', dir: 'asc' }, { sort: 's2', dir: 'desc' }]).toEqual(condition.getSort())

    expect([
      [Condition.EQUALS, 'a', 1],
      [Condition.NOT_EQUALS, 'b', 2],
      [Condition.LESS_THAN, 'c', 3],
      [Condition.GREATER_THAN, 'd', 4],
      [Condition.LESS_OR_EQUALS, 'e', 5],
      [Condition.GREATER_OR_EQUALS, 'f', 6],
      [Condition.BETWEEN, 'g', [7, 8]],
      [Condition.IN, 'h', [9, 10]],
      [Condition.LIKE, 'i', 'asd'],
    ]).toEqual(condition.getConditions())
  })
})

describe('Test Conditions Arguments', () => {
  it('should create a condition', () => {
    const condition = new Condition([
      { operator: Condition.EQUALS, field: 'a', value: 1 },
      { operator: Condition.NOT_EQUALS, field: 'b', value: 2 },
      { operator: Condition.LESS_THAN, field: 'c', value: 3 },
      { operator: Condition.GREATER_THAN, field: 'd', value: 4 },
      { operator: Condition.LESS_OR_EQUALS, field: 'e', value: 5 },
      { operator: Condition.GREATER_OR_EQUALS, field: 'f', value: 6 },
      { operator: Condition.BETWEEN, field: 'g', value: [7, 8] },
      { operator: Condition.IN, field: 'h', value: [9, 10] },
      { operator: Condition.LIKE, field: 'i', value: 'asd' },
    ])

    expect([
      [Condition.EQUALS, 'a', 1],
      [Condition.NOT_EQUALS, 'b', 2],
      [Condition.LESS_THAN, 'c', 3],
      [Condition.GREATER_THAN, 'd', 4],
      [Condition.LESS_OR_EQUALS, 'e', 5],
      [Condition.GREATER_OR_EQUALS, 'f', 6],
      [Condition.BETWEEN, 'g', [7, 8]],
      [Condition.IN, 'h', [9, 10]],
      [Condition.LIKE, 'i', 'asd'],
    ]).toEqual(condition.getConditions())
  })
})
