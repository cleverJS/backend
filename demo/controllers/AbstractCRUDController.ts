import { ValidationError } from 'fastest-validator'

import { AbstractService } from '../../core/AbstractService'
import { Condition } from '../../core/db/Condition'
import { DBEntityResource } from '../../core/db/sql/DBEntityResource'
import { IEntity } from '../../core/entity/AbstractEntity'
import { loggerNamespace } from '../../core/logger/logger'
import { Paginator } from '../../core/utils/Paginator'
import { WSRequest } from '../../core/ws/WSRequest'
import { WSServer } from '../../core/ws/WSServer'
import { IAppConnectionInfo } from '../types/WSConnection'

import { AbstractController, IJSendResponse } from './AbstractController'
import { controllerValidator } from './validators/ControllerValidator'
import { EValidator } from './validators/enum/ValidatorNameList'
import { GlobalControllerValidator } from './validators/GlobalControllerValidator'

export abstract class AbstractCRUDController<T extends AbstractService<IEntity, DBEntityResource<any>>> extends AbstractController {
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

    const { payload } = request

    const validatorResult = await this.validateSavePayload(payload)

    if (validatorResult !== true) {
      return this.responseFail(validatorResult)
    }

    let entity = null
    try {
      entity = await this.service.createEntity(payload)
      this.beforeSave(entity, connection)
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
    const entity = await this.service.findById(id)
    const item = entity ? await this.modifyIdResponse(entity) : null

    return this.responseSuccess({ item })
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

    const entities = await this.service.list(paginator, condition)
    const items = await this.modifyListResponse(entities)

    return this.responseSuccess({ items, total: paginator.getTotal() })
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

  protected validateSavePayload(payload: Record<string, any>): ValidationError[] | true | Promise<ValidationError[] | true> {
    return true
  }

  protected async modifyIdResponse(entity: IEntity) {
    return entity.getData(false)
  }

  protected async modifyListResponse(entities: IEntity[]) {
    return entities.map((i) => i.getData(false))
  }

  protected beforeSave(entity: Record<string, any>, connection: IAppConnectionInfo) {}

  protected init(): void {
    this.wsServer.onRequest(this.controllerName, 'fetch-by-id', this.actionFetchById)
    this.wsServer.onRequest(this.controllerName, 'fetch-list', this.actionFetchList)
    this.wsServer.onRequest(this.controllerName, 'save', this.actionSave)
    this.wsServer.onRequest(this.controllerName, 'delete', this.actionDelete)
  }
}
