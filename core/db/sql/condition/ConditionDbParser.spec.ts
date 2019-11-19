import { ConditionDbParser } from './ConditionDbParser'
import Knex from 'knex'
import { Condition } from '../../Condition'

describe('Test Conditions', () => {
  it('should create a mysql condition', () => {
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

    const parser = new ConditionDbParser()
    const queryBuilder = Knex({
      client: 'mysql',
    })
    const qb = queryBuilder('test')
    parser.parse(qb, condition)
    expect(qb.toQuery()).toEqual(
      // tslint:disable-next-line:max-line-length
      'select * from `test` where `a` = 1 and `b` <> 2 and `c` < 3 and `d` > 4 and `e` <= 5 and `f` >= 6 and `g` between 7 and 8 and `h` in (9, 10) and `i` like \'%asd%\' order by `s1` asc, `s2` desc limit 15 offset 5'
    )
  })
})
