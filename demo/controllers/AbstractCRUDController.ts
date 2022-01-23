import { ValidationError } from 'fastest-validator'
import { IAppConnectionInfo } from '../types/WSConnection'
import { WSRequest } from '../../core/ws/WSRequest'
import { AbstractService } from '../../core/AbstractService'
import { IEntity } from '../../core/entity/AbstractEntity'
import { AbstractResource } from '../../core/db/AbstractResource'
import { AbstractController, IJSendResponse } from './AbstractController'
import { WSServer } from '../../core/ws/WSServer'
import { Paginator } from '../../core/utils/Paginator'
import { Condition } from '../../core/db/Condition'
import { loggerNamespace } from '../../core/logger/logger'
import { GlobalControllerValidator } from './validators/GlobalControllerValidator'
import { EValidator } from './validators/enum/ValidatorNameList'
import { controllerValidator } from './validators/ControllerValidator'

export abstract class AbstractCRUDController<T extends AbstractService<IEntity, AbstractResource<any>>> extends AbstractController {
  protected readonly logger = loggerNamespace(`AbstractCRUDController:${this.constructor.name}`)
  protected controllerName: string
  protected shouldAuthorized = true
  protected service: T

  public constructor(wsServer: WSServer, service: T, controllerName: string) {
    super(wsServer)
    this.controllerName = controllerName
    this.service = service
    GlobalControllerValidator.init()
    this.init()
  }

  protected actionSave = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    if (this.shouldAuthorized && !(await this.isAuthorized(connection))) {
      return this.responseAccessDenied()
    }

    const validatorResult = await this.validateSavePayload()

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { payload } = request

    let entity = null
    try {
      entity = this.service.createEntity(payload)
      await this.service.save(entity)
    } catch (e) {
      this.logger.error(e)
    }

    if (entity) {
      return this.responseSuccess({ id: entity.id })
    }

    return this.responseFail({})
  }

  protected actionFetchById = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    if (this.shouldAuthorized && !(await this.isAuthorized(connection))) {
      return this.responseAccessDenied()
    }

    const validatorResult = await controllerValidator.validate(EValidator.idExists, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { id } = request.payload
    const item = await this.service.findById(id)
    return this.responseSuccess({ item: item?.getData(false) || null })
  }

  protected actionFetchList = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    if (this.shouldAuthorized && !(await this.isAuthorized(connection))) {
      return this.responseAccessDenied()
    }

    const validatorResult = await controllerValidator.validate(EValidator.list, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { conditions, page = 1, itemsPerPage = 5, sort: sortArray = [], skipTotal = false } = request.payload

    const condition = new Condition(conditions ? { conditions } : undefined)

    for (const sort of sortArray) {
      condition.addSort(sort.name, sort.dir)
    }

    const paginator = new Paginator()
    paginator.setItemsPerPage(itemsPerPage)
    paginator.setCurrentPage(page)
    paginator.setSkipTotal(skipTotal)

    const items = await this.service.list(paginator, condition)
    return this.responseSuccess({ items: items.map((i) => i.getData(false)), total: paginator.getTotal() })
  }

  protected actionDelete = async (request: WSRequest, connection: IAppConnectionInfo): Promise<IJSendResponse> => {
    if (this.shouldAuthorized && !(await this.isAuthorized(connection))) {
      return this.responseAccessDenied()
    }

    const validatorResult = await controllerValidator.validate(EValidator.idExists, request.payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    const { id } = request.payload
    const result = await this.service.delete(id)
    if (result) {
      return this.responseSuccess({})
    }

    return this.responseFail({})
  }

  protected validateSavePayload(): ValidationError[] | true | Promise<ValidationError[] | true> {
    return true
  }

  protected init(): void {
    this.wsServer.onRequest(this.controllerName, 'fetch-by-id', this.actionFetchById)
    this.wsServer.onRequest(this.controllerName, 'fetch-list', this.actionFetchList)
    this.wsServer.onRequest(this.controllerName, 'save', this.actionSave)
    this.wsServer.onRequest(this.controllerName, 'delete', this.actionDelete)
  }
}
