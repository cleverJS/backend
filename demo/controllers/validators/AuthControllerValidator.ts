import Validator from 'fastest-validator'
import { AbstractControllerValidator } from './AbstractControllerValidator'

type TValidator =
  | 'ValidatorTelegram'
  | 'ValidatorSingIn'
  | 'ValidatorSingInByToken'
  | 'ValidatorRefreshToken'
  | 'ValidatorRegistration'
  | 'ValidatorForgot'
  | 'ValidatorReset'

export class AuthControllerValidator extends AbstractControllerValidator<TValidator> {
  public constructor() {
    super()
    this.initValidatorTelegram()
    this.initValidatorSingIn()
    this.initValidatorSingInByToken()
    this.initValidatorRefreshToken()
    this.initValidatorRegistration()
    this.initValidatorForgot()
    this.initValidatorReset()
  }

  protected initValidatorTelegram(): void {
    const schema = {
      auth_date: { type: 'number' },
      hash: { type: 'string' },
      id: { type: 'number' },
      first_name: { type: 'string', optional: true },
      last_name: { type: 'string', optional: true },
      username: { type: 'string', optional: true },
      photo_url: { type: 'string', optional: true },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorTelegram', validator.compile(schema))
  }

  protected initValidatorSingIn(): void {
    const schema = {
      login: { type: 'email' },
      password: { type: 'string' },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorSingIn', validator.compile(schema))
  }

  protected initValidatorSingInByToken(): void {
    const schema = {
      token: { type: 'string' },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorSingInByToken', validator.compile(schema))
  }

  protected initValidatorRefreshToken(): void {
    const schema = {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorRefreshToken', validator.compile(schema))
  }

  protected initValidatorRegistration(): void {
    const schema = {
      login: { type: 'email' },
      password: { type: 'string' },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorRegistration', validator.compile(schema))
  }

  protected initValidatorForgot(): void {
    const schema = {
      email: { type: 'email' },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorForgot', validator.compile(schema))
  }

  protected initValidatorReset(): void {
    const schema = {
      token: { type: 'string' },
      password: { type: 'string' },
      $$strict: true,
    }

    const validator = new Validator()
    this.setValidator('ValidatorReset', validator.compile(schema))
  }
}
