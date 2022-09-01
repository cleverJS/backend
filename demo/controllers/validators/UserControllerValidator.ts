import { controllerValidator } from './ControllerValidator'
import { EValidator } from './enum/ValidatorNameList'

export class UserControllerValidator {
  private static instance: UserControllerValidator

  public static init(): UserControllerValidator {
    if (!UserControllerValidator.instance) {
      UserControllerValidator.instance = new UserControllerValidator()
    }

    return UserControllerValidator.instance
  }

  private constructor() {
    this.initValidatorList()
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
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.userControllerValidatorList, schema)
  }

  protected initValidatorCreate(): void {
    const schema = {
      roleId: { type: 'number', positive: true, integer: true, min: 1 },
      firstName: { type: 'string', alpha: true, max: 50 },
      lastName: { type: 'string', alpha: true, max: 50 },
      login: { type: 'string' },
      password: { type: 'string' },
      $$strict: true,
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.userControllerValidatorCreate, schema)
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
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.userControllerValidatorUpdate, schema)
  }
}
