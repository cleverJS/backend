import { AbstractResource } from './db/AbstractResource'
import { AbstractEntity } from './entity/AbstractEntity'
import { Condition } from './db/Condition'
import { AbstractObject } from './AbstractObject'

export interface IAbstractDependenciesList<T extends AbstractEntity<AbstractObject>> {
  resource: AbstractResource<T>
}

export abstract class AbstractService<T extends AbstractEntity<AbstractObject>> {
  protected deps: IAbstractDependenciesList<T>

  protected constructor(deps: IAbstractDependenciesList<T>) {
    this.deps = deps
  }

  public findById(id: string) {
    return this.deps.resource.findById(id)
  }

  public findOne(condition: Condition) {
    return this.deps.resource.findOne(condition)
  }

  public findAll(condition: Condition) {
    return this.deps.resource.findAll(condition)
  }

  public count(condition?: Condition) {
    return this.deps.resource.count(condition)
  }

  public delete(id: string) {
    return this.deps.resource.delete(id)
  }

  public deleteAll(condition: Condition) {
    return this.deps.resource.deleteAll(condition)
  }

  public save(item: T) {
    return this.deps.resource.save(item)
  }
}
