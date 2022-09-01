import { controllerValidator } from './ControllerValidator'
import { EValidator } from './enum/ValidatorNameList'
import { GlobalValidationSchemeList } from './scheme/GlobalValidationSchemeList'

export class GlobalControllerValidator {
  private static instance: GlobalControllerValidator

  public static init(): GlobalControllerValidator {
    if (!GlobalControllerValidator.instance) {
      GlobalControllerValidator.instance = new GlobalControllerValidator()
    }

    return GlobalControllerValidator.instance
  }

  private constructor() {
    this.initValidatorIdExists()
    this.initValidatorList()
  }

  protected initValidatorIdExists(): void {
    controllerValidator.initValidator(EValidator.idExists, GlobalValidationSchemeList.schemaIdExists)
  }

  protected initValidatorList(): void {
    controllerValidator.initValidator(EValidator.list, GlobalValidationSchemeList.schemaList())
  }
}
