import { UserService } from '../modules/user/UserService'
import { UserControllerValidator } from './validators/UserControllerValidator'
import { IProtectDependencies } from '../modules/security/auth/AuthService'
import { IAppConnectionInfo } from '../types/WSConnection'
import { AbstractController, IJSendResponse } from './AbstractController'
import { WSServer } from '../../core/ws/WSServer'
import { WSRequest } from '../../core/ws/WSRequest'
import { MSG_ACCESS_DENIED } from '../configs/messages'

interface IDependencies extends IProtectDependencies {
  userService: UserService
  wsServer: WSServer
}

export class UserController extends AbstractController {
  protected readonly deps!: IDependencies
  protected validator: UserControllerValidator

  public constructor(deps: IDependencies) {
    super(deps)
    this.validator = new UserControllerValidator()
    this.init()
  }

  public actionFetchById = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    const { read, write } = connection.state.permissions.user

    if (!(await this.isAuthorized(connection)) && !(read || write)) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    const validatorResult = await this.validator.validate('ValidatorIdExists', request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { id } = request.payload

    const result = await this.deps.userService.findById(id)
    return this.responseSuccess({
      item: result ? result.getNonSecureData() : null,
    })
  }

  protected init(): void {
    this.deps.wsServer.onRequest('user', 'fetchById', this.actionFetchById)
  }
}
