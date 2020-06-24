import Knex from "knex";
import { ConditionDbParser } from "./ConditionDbParser";
import { Condition, TConditionOperator } from "../../Condition";

describe('Test Conditions', () => {
  let condition1: Condition
  let condition2: Condition
  let condition3: Condition
  let condition4: Condition
  let condition5: Condition

  beforeEach(() => {
    condition1 = new Condition({
      logic: 'or',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    condition2 = new Condition({
      logic: 'and',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    condition3 = new Condition({
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

    condition4 = new Condition({
      logic: 'and',
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'a', value: 1 }],
    })

    condition5 = new Condition({
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

  it('should add or condition after creation', () => {
    const parser = new ConditionDbParser()
    const connection = Knex({
      client: 'mysql',
    })

    let qb = connection.table('test')
    parser.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 or `b` = 2)')

    condition1.addCondition({
      logic: 'and',
      conditions: [
        { operator: TConditionOperator.EQUALS, field: 'a', value: 1 },
        { operator: TConditionOperator.EQUALS, field: 'b', value: 2 },
      ],
    })

    qb = connection.table('test')
    parser.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where ((`a` = 1 or `b` = 2) and (`a` = 1 and `b` = 2))')
  })

  it('should add and condition after creation', () => {
    const parser = new ConditionDbParser()
    const connection = Knex({
      client: 'mysql',
    })

    let qb = connection.table('test')
    parser.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 or `b` = 2)')

    condition1.addCondition({
      logic: 'and',
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'c', value: 1 }],
    })

    qb = connection.table('test')
    parser.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where ((`a` = 1 or `b` = 2) and (`c` = 1))')
  })

  it('should add and condition after creation', () => {
    const parser = new ConditionDbParser()
    const connection = Knex({
      client: 'mysql',
    })

    let qb = connection.table('test')
    parser.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` = 1 or `b` = 2)')

    condition1.addCondition({
      logic: 'and',
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'c', value: 1 }],
    })

    condition1.addCondition({
      conditions: [{ operator: TConditionOperator.EQUALS, field: 'd', value: 1 }],
    }, 'or')

    qb = connection.table('test')
    parser.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (((`a` = 1 or `b` = 2) and (`c` = 1)) or (`d` = 1))')
  })

  it('should add like', () => {
    const parser = new ConditionDbParser()
    const connection = Knex({
                              client: 'mysql',
                            })

    let qb = connection.table('test')
    const condition1 = new Condition({ conditions: [{ operator: TConditionOperator.LIKE, field: 'a', value: '%test'}]})

    parser.parse(qb, condition1)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` like \'%test\')')

    qb = connection.table('test')
    const condition2 = new Condition({ conditions: [{ operator: TConditionOperator.LIKE, field: 'a', value: '%test%'}]})

    parser.parse(qb, condition2)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` like \'%test%\')')

    qb = connection.table('test')
    const condition3 = new Condition({ conditions: [{ operator: TConditionOperator.NOT_LIKE, field: 'a', value: '%test%'}]})

    parser.parse(qb, condition3)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` not like \'%test%\')')

    qb = connection.table('test')
    const condition4 = new Condition({ conditions: [{ operator: TConditionOperator.NOT_LIKE, field: 'a', value: 'test%'}]})

    parser.parse(qb, condition4)
    expect(qb.toQuery()).toEqual('select * from `test` where (`a` not like \'test%\')')
  })
})
