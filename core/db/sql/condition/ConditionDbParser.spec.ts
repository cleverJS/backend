import Knex from 'knex'
import { ConditionDbParser } from './ConditionDbParser'
import { Condition, TConditionOperator } from '../../Condition'

describe('Test Conditions', () => {
  const condition1 = new Condition({
    logic: 'or',
    conditions: [
      { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
      { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
    ],
  })

  const condition2 = new Condition({
    logic: 'and',
    conditions: [
      { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
      { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
    ],
  })

  const condition3 = new Condition({
    logic: 'or',
    conditions: [
      {
        logic: 'or',
        conditions: [
          { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
          { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
        ],
      },
      {
        logic: 'and',
        conditions: [
          { operator: TConditionOperator.EQUALS, field: 'c', value: 1 },
          { operator: TConditionOperator.EQUALS, field: 'd', value: 2 },
        ],
      },
      { operator: TConditionOperator.EQUALS, field: 'e', value: 1 },
    ],
  })

  const condition4 = new Condition({
    logic: 'and',
    conditions: [{ operator: TConditionOperator.EQUALS, field: 'a', value: 1 }],
  })

  const condition5 = new Condition({
    logic: 'and',
    conditions: [
      {
        logic: 'or',
        conditions: [
          { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
          { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
        ],
      },
      {
        logic: 'and',
        conditions: [
          { operator: TConditionOperator.EQUALS, field: 'c', value: 1 },
          { operator: TConditionOperator.EQUALS, field: 'd', value: 2 },
        ],
      },
    ],
  })

  it('should create a mysql or condition', () => {
    const parser = new ConditionDbParser()
    const connection = Knex({
      client: 'mysql',
    })

    let qb = connection.table('test')
    parser.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 or `b` = 2)')

    qb = connection.table('test')
    parser.parse(qb, condition2)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 and `b` = 2)')

    qb = connection.table('test')
    parser.parse(qb, condition3)
    expect(qb.toQuery()).toEqual('select * from `test` where ((`a` = 1 or `b` = 2) or (`c` = 1 and `d` = 2) or `e` = 1)')

    qb = connection.table('test')
    parser.parse(qb, condition4)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1)')

    qb = connection.table('test')
    parser.parse(qb, condition5)
    expect(qb.toQuery()).toEqual('select * from `test` where ((`a` = 1 or `b` = 2) and (`c` = 1 and `d` = 2))')
  })
})
