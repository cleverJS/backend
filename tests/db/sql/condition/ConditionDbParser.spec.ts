import knex from 'knex'
import { Condition, TConditionOperator } from '../../../../core/db/Condition'
import { ConditionDbParser } from '../../../../core/db/sql/condition/ConditionDbParser'

describe('Test Conditions', () => {
  const conditionDBParse = ConditionDbParser.getInstance()
  const connection = knex({
    client: 'sqlite3',
    useNullAsDefault: true,
  })

  it('should create a mysql or condition', () => {
    let qb = connection.table('test')
    const condition1 = new Condition({
      logic: 'or',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    conditionDBParse.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 or `b` = 2)')

    const condition2 = new Condition({
      logic: 'and',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    qb = connection.table('test')
    conditionDBParse.parse(qb, condition2)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 and `b` = 2)')

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

    qb = connection.table('test')
    conditionDBParse.parse(qb, condition3)
    expect(qb.toQuery()).toEqual('select * from `test` where ((`a` = 1 or `b` = 2) or (`c` = 1 and `d` = 2) or `e` = 1)')

    const condition4 = new Condition({
      logic: 'and',
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'a', value: 1 }],
    })

    qb = connection.table('test')
    conditionDBParse.parse(qb, condition4)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1)')

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

    qb = connection.table('test')
    conditionDBParse.parse(qb, condition5)
    expect(qb.toQuery()).toEqual('select * from `test` where ((`a` = 1 or `b` = 2) and (`c` = 1 and `d` = 2))')
  })

  it('should add or condition after creation', () => {
    let qb = connection.table('test')

    const condition1 = new Condition({
      logic: 'or',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    conditionDBParse.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 or `b` = 2)')

    condition1.addCondition({
      logic: 'and',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    qb = connection.table('test')
    conditionDBParse.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where ((`a` = 1 or `b` = 2) and (`a` = 1 and `b` = 2))')
  })

  it('should add and condition after creation', () => {
    const condition1 = new Condition({
      logic: 'or',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    let qb = connection.table('test')
    conditionDBParse.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 or `b` = 2)')

    condition1.addCondition({
      logic: 'and',
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'c', value: 1 }],
    })

    qb = connection.table('test')
    conditionDBParse.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where ((`a` = 1 or `b` = 2) and (`c` = 1))')
  })

  it('should add and condition after creation 2', () => {
    const condition1 = new Condition({
      logic: 'or',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    let qb = connection.table('test')
    conditionDBParse.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 or `b` = 2)')

    condition1.addCondition({
      logic: 'and',
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'c', value: 1 }],
    })

    condition1.addCondition(
      {
        conditions: [{ operator: TConditionOperator.EQUALS, field: 'd', value: 1 }],
      },
      'or'
    )

    qb = connection.table('test')
    conditionDBParse.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (((`a` = 1 or `b` = 2) and (`c` = 1)) or (`d` = 1))')
  })

  it('should add like', () => {
    let qb = connection.table('test')
    const condition11 = new Condition({ conditions: [{ operator: TConditionOperator.LIKE, field: 'a', value: '%test' }] })

    conditionDBParse.parse(qb, condition11)
    expect(qb.toQuery()).toEqual("select * from `test` where (`a` like '%test')")

    qb = connection.table('test')
    const condition22 = new Condition({ conditions: [{ operator: TConditionOperator.LIKE, field: 'a', value: '%test%' }] })

    conditionDBParse.parse(qb, condition22)
    expect(qb.toQuery()).toEqual("select * from `test` where (`a` like '%test%')")

    qb = connection.table('test')
    const condition33 = new Condition({ conditions: [{ operator: TConditionOperator.NOT_LIKE, field: 'a', value: '%test%' }] })

    conditionDBParse.parse(qb, condition33)
    expect(qb.toQuery()).toEqual("select * from `test` where (`a` not like '%test%')")

    qb = connection.table('test')
    const condition44 = new Condition({ conditions: [{ operator: TConditionOperator.NOT_LIKE, field: 'a', value: 'test%' }] })

    conditionDBParse.parse(qb, condition44)
    expect(qb.toQuery()).toEqual("select * from `test` where (`a` not like 'test%')")
  })

  it('should cloned', () => {
    const condition = new Condition({ conditions: [{ operator: TConditionOperator.NOT_LIKE, field: 'a', value: 'test%' }] })
    condition.setSort('id', 'asc')

    const conditionCloned = condition.clone()
    conditionCloned.clearSort()
    condition.addCondition({ conditions: [{ operator: TConditionOperator.EQUALS, field: 'b', value: 'test' }] })

    expect(condition.getConditionItemList()?.conditions.length).toEqual(2)
    expect(condition.getSort()).toEqual([{ sort: 'id', dir: 'asc' }])
    expect(conditionCloned.getSort()).toEqual([])
    expect(conditionCloned.getConditionItemList()?.conditions.length).toEqual(1)
  })

  it('should add RAW conditon', () => {
    const qb = connection.table('test')
    const condition = new Condition({
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.RAW, value: 'CONTAINS([a], 1)' },
      ],
    })

    conditionDBParse.parse(qb, condition)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 and CONTAINS([a], 1))')
  })
})
