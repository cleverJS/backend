import { SyncCheckFunction, AsyncCheckFunction, ValidationError } from 'fastest-validator'

export type IValidator = SyncCheckFunction | AsyncCheckFunction

export abstract class AbstractControllerValidator<T> {
  private validators: Map<string, IValidator> = new Map()

  public validate(name: T, payload: Record<string, any>): ValidationError[] | true | Promise<ValidationError[] | true> {
    let result: ValidationError[] | true | Promise<ValidationError[] | true> = true
    const validator = this.getValidator(name)
    if (validator) {
      result = validator(payload)
    }
    return result
  }

  protected setValidator(name: string, validator: IValidator): void {
    this.validators.set(`${this.constructor.name}:${name}`, validator)
  }

  protected getValidator(name: T): IValidator {
    const validator = this.validators.get(`${this.constructor.name}:${name}`)
    if (!validator) {
      throw new Error(`${this.constructor.name}:getValidator Validator ${name} was not found`)
    }

    return validator
  }
}
