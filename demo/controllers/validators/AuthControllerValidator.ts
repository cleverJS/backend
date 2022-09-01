import { controllerValidator } from './ControllerValidator'
import { EValidator } from './enum/ValidatorNameList'

export class AuthControllerValidator {
  private static instance: AuthControllerValidator

  public static init(): AuthControllerValidator {
    if (!AuthControllerValidator.instance) {
      AuthControllerValidator.instance = new AuthControllerValidator()
    }

    return AuthControllerValidator.instance
  }

  private constructor() {
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
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.authControllerValidatorTelegram, schema)
  }

  protected initValidatorSingIn(): void {
    const schema = {
      login: { type: 'email' },
      password: { type: 'string' },
      $$strict: true,
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.authControllerValidatorSingIn, schema)
  }

  protected initValidatorSingInByToken(): void {
    const schema = {
      token: { type: 'string' },
      $$strict: true,
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.authControllerValidatorSingInByToken, schema)
  }

  protected initValidatorRefreshToken(): void {
    const schema = {
      accessToken: { type: 'string' },
      refreshToken: { type: 'string' },
      $$strict: true,
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.authControllerValidatorRefreshToken, schema)
  }

  protected initValidatorRegistration(): void {
    const schema = {
      login: { type: 'email' },
      password: { type: 'string' },
      $$strict: true,
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.authControllerValidatorRegistration, schema)
  }

  protected initValidatorForgot(): void {
    const schema = {
      email: { type: 'email' },
      $$strict: true,
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.authControllerValidatorForgot, schema)
  }

  protected initValidatorReset(): void {
    const schema = {
      token: { type: 'string' },
      password: { type: 'string' },
      $$strict: true,
      $$async: true,
    }

    controllerValidator.initValidator(EValidator.authControllerValidatorReset, schema)
  }
}
