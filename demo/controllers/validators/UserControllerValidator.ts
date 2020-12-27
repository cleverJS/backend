import Validator from 'fastest-validator'
import { AbstractControllerValidator } from './AbstractControllerValidator'

type TValidator = 'ValidatorIdExists'

export class UserControllerValidator extends AbstractControllerValidator<TValidator> {
  public constructor() {
    super()
    this.initValidatorList()
    this.initValidatorIdExists()
    this.initValidatorCreate()
    this.initValidatorUpdate()
  }

  protected initValidatorList(): void {
    const schema = {
      page: { type: 'number', positive: true, integer: true, min: 1, optional: true },
      size: { type: 'number', positive: true, integer: true, min: 1, optional: true },
      filter: {
        type: 'object',
        optional: true,
        strict: true,
        props: {
          login: { type: 'string', optional: true },
        },
      },
      sort: {
        type: 'object',
        optional: true,
        strict: true,
        props: {
          field: { type: 'string', optional: true },
          direction: { type: 'enum', optional: true, values: ['asc', 'desc'] },
        },
      },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorList', validator.compile(schema))
  }

  protected initValidatorIdExists(): void {
    const schema = {
      id: { type: 'number', positive: true, integer: true, min: 1 },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorIdExists', validator.compile(schema))
  }

  protected initValidatorCreate(): void {
    const schema = {
      roleId: { type: 'number', positive: true, integer: true, min: 1 },
      firstName: { type: 'string', alpha: true, max: 50 },
      lastName: { type: 'string', alpha: true, max: 50 },
      login: { type: 'string' },
      password: { type: 'string' },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorCreate', validator.compile(schema))
  }

  protected initValidatorUpdate(): void {
    const schema = {
      id: { type: 'number', positive: true, integer: true, min: 1 },
      roleId: { type: 'number', positive: true, integer: true, min: 1, optional: true },
      firstName: { type: 'string', alpha: true, max: 50, optional: true },
      lastName: { type: 'string', alpha: true, max: 50, optional: true },
      login: { type: 'string', optional: true },
      password: { type: 'string', optional: true },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorUpdate', validator.compile(schema))
  }
}
