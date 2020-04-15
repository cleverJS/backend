import { AbstractResource } from './db/AbstractResource'
import { AbstractEntity } from './entity/AbstractEntity'
import { Condition } from './db/Condition'
import { Paginator } from './utils/Paginator'

export interface IAbstractDependenciesList<T extends AbstractEntity<Record<string, any>>> {
  resource: AbstractResource<T>
}

export abstract class AbstractService<T extends AbstractEntity<Record<string, any>>> {
  protected deps: IAbstractDependenciesList<T>

  public constructor(deps: IAbstractDependenciesList<T>) {
    this.deps = deps
  }

  public findById(id: string) {
    return this.deps.resource.findById(id)
  }

  public findOne(condition: Condition) {
    return this.deps.resource.findOne(condition)
  }

  public findAll(condition?: Condition) {
    return this.deps.resource.findAll(condition)
  }

  public findAllRaw(condition?: Condition) {
    return this.deps.resource.findAllRaw(condition)
  }

  public count(condition?: Condition) {
    return this.deps.resource.count(condition)
  }

  public delete(id: string) {
    return this.deps.resource.delete(id)
  }

  public deleteAll(condition?: Condition) {
    return this.deps.resource.deleteAll(condition)
  }

  public save(item: T) {
    return this.deps.resource.save(item)
  }

  public createEntity(data: Partial<T>) {
    return this.deps.resource.createEntity(data)
  }

  public async list(paginator: Paginator, condition: Condition) {
    const nextCondition = await this.prepareListCondition(paginator, condition)
    return this.findAll(nextCondition)
  }

  public async listRaw(paginator: Paginator, condition: Condition) {
    const nextCondition = await this.prepareListCondition(paginator, condition)
    return this.findAllRaw(nextCondition)
  }

  protected async prepareListCondition(paginator: Paginator, condition: Condition) {
    const nextCondition = condition.clone()
    let total = paginator.getTotal()
    if (!total) {
      total = (await this.count(condition)) || 0
      paginator.setTotal(total)
    }
    nextCondition.limit(paginator.getLimit())
    nextCondition.offset(paginator.getOffset())

    return nextCondition
  }
}
