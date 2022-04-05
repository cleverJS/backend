import { ValidationSchema } from 'fastest-validator'
import { TConditionOperator } from '../../../../core/db/Condition'

export class GlobalValidationSchemeList {
  public static schemaIdExists: ValidationSchema = {
    id: { type: 'number', positive: true, integer: true, min: 1 },
    $$strict: true,
    $$async: true,
  }

  public static schemaList(): ValidationSchema {
    const conditionItemScheme = {
      type: 'object',
      optional: true,
      strict: 'remove',
      props: {
        operator: { type: 'enum', values: Object.values(TConditionOperator) },
        field: { type: 'string' },
        value: [
          { type: 'string', nullable: true },
          { type: 'number', nullable: true },
          { type: 'array', nullable: true, items: { type: 'string' } },
          { type: 'array', nullable: true, items: { type: 'number' } },
        ],
      },
    }

    const conditionItemListScheme = {}
    Object.assign(conditionItemListScheme, {
      type: 'object',
      optional: true,
      strict: 'remove',
      props: {
        logic: { type: 'enum', optional: true, values: ['or', 'and'] },
        conditions: {
          type: 'array',
          items: [conditionItemListScheme, conditionItemScheme],
        },
      },
    })

    return {
      page: { type: 'number', positive: true, integer: true, min: 1, optional: true },
      size: { type: 'number', positive: true, integer: true, min: 1, optional: true },
      conditions: conditionItemListScheme,
      sort: {
        type: 'array',
        optional: true,
        strict: 'remove',
        items: {
          type: 'object',
          props: {
            field: { type: 'string', optional: true },
            direction: { type: 'enum', optional: true, values: ['asc', 'desc'] },
          },
        },
      },
      $$strict: true,
      $$async: true,
    }
  }
}
