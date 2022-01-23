import { UserService } from '../modules/user/UserService'
import { IAppConnectionInfo } from '../types/WSConnection'
import { IJSendResponse } from './AbstractController'
import { WSServer } from '../../core/ws/WSServer'
import { WSRequest } from '../../core/ws/WSRequest'
import { MSG_ACCESS_DENIED } from '../configs/messages'
import { AbstractCRUDController } from './AbstractCRUDController'
import { EValidator } from './validators/enum/ValidatorNameList'
import { controllerValidator } from './validators/ControllerValidator'
import { UserControllerValidator } from './validators/UserControllerValidator'

export class UserController extends AbstractCRUDController<UserService> {
  public constructor(wsServer: WSServer, service: UserService) {
    super(wsServer, service, 'user')
    UserControllerValidator.init()
    this.init()
  }

  public actionFetchById = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    const { read, write } = connection.state.permissions.user

    if (!(await this.isAuthorized(connection)) && !(read || write)) {
      return this.responseError(MSG_ACCESS_DENIED)
    }

    const validatorResult = await controllerValidator.validate(EValidator.idExists, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { id } = request.payload

    const result = await this.service.findById(id)
    return this.responseSuccess({
      item: result ? result.getNonSecureData() : null,
    })
  }

  protected init(): void {
    this.wsServer.onRequest('user', 'fetchById', this.actionFetchById)
  }
}
