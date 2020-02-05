import { AbstractResource } from './db/AbstractResource'
import { AbstractEntity } from './entity/AbstractEntity'
import { Condition } from './db/Condition'
import { AbstractObject } from './AbstractObject'
import { Paginator } from './utils/Paginator'

export interface IAbstractDependenciesList<T extends AbstractEntity<AbstractObject>> {
  resource: AbstractResource<T>
}

export abstract class AbstractService<T extends AbstractEntity<AbstractObject>> {
  protected deps: IAbstractDependenciesList<T>

  protected constructor(deps: IAbstractDependenciesList<T>) {
    this.deps = deps
  }

  public async findById(id: string) {
    return this.deps.resource.findById(id)
  }

  public async findOne(condition: Condition) {
    return this.deps.resource.findOne(condition)
  }

  public async findAll(condition: Condition) {
    return this.deps.resource.findAll(condition)
  }

  public async findAllRaw(condition: Condition) {
    return this.deps.resource.findAllRaw(condition)
  }

  public async count(condition?: Condition) {
    return this.deps.resource.count(condition)
  }

  public async delete(id: string) {
    return this.deps.resource.delete(id)
  }

  public async deleteAll(condition: Condition) {
    return this.deps.resource.deleteAll(condition)
  }

  public async save(item: T) {
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
