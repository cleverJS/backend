import { controllerValidator } from '../../../../demo/controllers/validators/ControllerValidator'
import { TConditionOperator } from '../../../../core/db/Condition'
import { EValidator } from '../../../../demo/controllers/validators/enum/ValidatorNameList'
import { GlobalControllerValidator } from '../../../../demo/controllers/validators/GlobalControllerValidator'

describe('Test AbstractCRUDControllerValidator', () => {
  it('should validate IConditionItem | IConditionItemList conditions', () => {
    const payload = {
      page: 1,
      size: 5,
      sort: [],
      filter: {
        conditions: [
          { operator: TConditionOperator.NOT_EQUALS, field: 'test', value: [1, 2] },
          { operator: TConditionOperator.EQUALS, field: 'test', value: 1 },
          { operator: TConditionOperator.BETWEEN, field: 'test', value: ['test', 'test2'] },
          { operator: TConditionOperator.EQUALS, field: 'test', value: 'test' },
          { conditions: [{ operator: TConditionOperator.EQUALS, field: 'test', value: 'test' }] },
        ],
      },
    }

    GlobalControllerValidator.init()
    const result = controllerValidator.validate(EValidator.list, payload)
    expect(result).toBeTruthy()
  })
})
