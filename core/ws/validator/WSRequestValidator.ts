import Validator, { ValidationError } from 'fastest-validator'
import { WSRequest } from '../WSRequest'

export class WSRequestValidator {
  public validator: (object: Record<string, any>) => true | ValidationError[]

  public constructor() {
    const schema = {
      header: {
        type: 'object',
        strict: true,
        props: {
          uuid: { type: 'string' },
          service: { type: 'string' },
          action: { type: 'string' },
        },
      },
      payload: {
        type: 'object',
        optional: true,
      },
      $$strict: true,
    }

    const validator = new Validator()
    this.validator = validator.compile(schema)
  }

  /**
   *
   * @param {WSRequest} request
   * @throws Error
   */
  public validate(request: WSRequest): boolean {
    const result = this.validator(request)
    return result === true
  }
}
