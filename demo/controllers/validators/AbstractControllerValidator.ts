import { ValidationError } from 'fastest-validator'

export type IValidator = (object: Record<string, any>) => true | ValidationError[]

export abstract class AbstractControllerValidator<T> {
  private validators: Map<string, IValidator> = new Map()

  public validate(name: T, payload: Record<string, any>): ValidationError[] | true {
    let result: ValidationError[] | true = true
    const validator = this.getValidator(name)
    if (validator) {
      result = validator(payload)
    }
    return result
  }

  protected setValidator(name: string, validator: IValidator): void {
    this.validators.set(`${this.constructor.name}:${name}`, validator)
  }

  protected getValidator(name: T): (object: Record<string, any>) => true | ValidationError[] {
    const validator = this.validators.get(`${this.constructor.name}:${name}`)
    if (!validator) {
      throw new Error(`${this.constructor.name}:getValidator Validator ${name} was not found`)
    }
    return validator
  }
}
