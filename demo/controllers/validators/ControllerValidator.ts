import Validator, { AsyncCheckFunction, SyncCheckFunction, ValidationError, ValidationSchema } from 'fastest-validator'

import { EValidator } from './enum/ValidatorNameList'

export type IValidator = SyncCheckFunction | AsyncCheckFunction

class ControllerValidator {
  private validators: Map<string, IValidator> = new Map()

  public validate(name: EValidator, payload: Record<string, any>): ValidationError[] | true | Promise<ValidationError[] | true> {
    const validator = this.getValidator(name)
    if (!validator) {
      throw new Error(`Validator ${name} was not found`)
    }

    return validator(payload)
  }

  public initValidator(name: EValidator, scheme: ValidationSchema) {
    const validator = new Validator()
    this.addValidator(name, validator.compile(scheme))
  }

  protected addValidator(name: EValidator, validator: IValidator): void {
    this.validators.set(`${this.constructor.name}:${name}`, validator)
  }

  protected getValidator(name: EValidator): IValidator {
    const validator = this.validators.get(`${this.constructor.name}:${name}`)
    if (!validator) {
      throw new Error(`${this.constructor.name}:getValidator Validator ${name} was not found`)
    }

    return validator
  }
}

export const controllerValidator = new ControllerValidator()
