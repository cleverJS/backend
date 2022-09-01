import { WSRequest } from '../../core/ws/WSRequest'
import { WSServer } from '../../core/ws/WSServer'
import { MSG_ACCESS_DENIED } from '../configs/messages'
import { UserService } from '../modules/user/UserService'
import { IAppConnectionInfo } from '../types/WSConnection'

import { IJSendResponse } from './AbstractController'
import { AbstractCRUDController } from './AbstractCRUDController'
import { controllerValidator } from './validators/ControllerValidator'
import { EValidator } from './validators/enum/ValidatorNameList'
import { UserControllerValidator } from './validators/UserControllerValidator'

interface IFetchRequest {
  id: number
}

export class UserController extends AbstractCRUDController<UserService> {
  public constructor(wsServer: WSServer, service: UserService) {
    super(wsServer, service, 'user')
    UserControllerValidator.init()
    this.init()
  }

  public actionFetchByPostId = async (request: WSRequest<IFetchRequest>, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
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
    this.wsServer.onRequest<IFetchRequest>('user', 'fetchByPostId', this.actionFetchByPostId)
  }
}
