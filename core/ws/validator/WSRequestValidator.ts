import Validator, { ValidationError } from 'fastest-validator'
import { WSRequest } from '../WSRequest'

export class WSRequestValidator {
  public validator: (object: object) => true | ValidationError[]

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

  public validate(request: WSRequest) {
    const result = this.validator(request)
    if (result !== true) {
      throw new Error(JSON.stringify(result))
    }

    return true
  }
}
