import Validator, { AsyncCheckFunction, SyncCheckFunction } from 'fastest-validator'

import { WSRequest } from '../WSRequest'

class WSRequestValidator {
  public validator: SyncCheckFunction | AsyncCheckFunction

  public constructor() {
    const schema = {
      header: {
        type: 'object',
        strict: 'remove',
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
      $$async: true,
    }

    const validator = new Validator()
    this.validator = validator.compile(schema)
  }

  /**
   *
   * @param {WSRequest} request
   * @throws Error
   */
  public async validate(request: WSRequest): Promise<boolean> {
    const result = await this.validator(request)
    return result === true
  }
}

export const wsRequestValidator = new WSRequestValidator()
