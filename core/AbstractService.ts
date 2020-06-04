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

  public findById(id: string): Promise<T | null> {
    return this.deps.resource.findById(id)
  }

  public findOne(condition: Condition): Promise<T | null> {
    return this.deps.resource.findOne(condition)
  }

  public findAll(condition?: Condition): Promise<T[]> {
    return this.deps.resource.findAll(condition)
  }

  public findAllRaw(condition?: Condition): Promise<any[]> {
    return this.deps.resource.findAllRaw(condition)
  }

  public count(condition?: Condition): Promise<number | null> {
    return this.deps.resource.count(condition)
  }

  public delete(id: string): Promise<boolean> {
    return this.deps.resource.delete(id)
  }

  public deleteAll(condition?: Condition): Promise<boolean> {
    return this.deps.resource.deleteAll(condition)
  }

  public save(item: T): Promise<boolean> {
    return this.deps.resource.save(item)
  }

  public createEntity(data: Partial<T>): T {
    return this.deps.resource.createEntity(data)
  }

  public async list(paginator: Paginator, condition: Condition): Promise<T[]> {
    const nextCondition = condition.clone()
    nextCondition.limit(paginator.getLimit())
    nextCondition.offset(paginator.getOffset())

    const total = paginator.getTotal()
    let totalPromise
    if (!total && !paginator.isSkipTotal()) {
      totalPromise = this.count(condition)
    }

    const resultPromise = this.findAll(nextCondition)

    const [result, totalNext] = await Promise.all([resultPromise, totalPromise])

    if (!total && !paginator.isSkipTotal()) {
      paginator.setTotal(totalNext || 0)
    }

    return result
  }

  public async listRaw(paginator: Paginator, condition: Condition): Promise<Record<string, any>[]> {
    const nextCondition = condition.clone()
    nextCondition.limit(paginator.getLimit())
    nextCondition.offset(paginator.getOffset())

    const total = paginator.getTotal()
    let totalPromise
    if (!total && !paginator.isSkipTotal()) {
      totalPromise = this.count(condition)
    }

    const resultPromise = this.findAllRaw(nextCondition)

    const [result, totalNext] = await Promise.all([resultPromise, totalPromise])

    if (!total && !paginator.isSkipTotal()) {
      paginator.setTotal(totalNext || 0)
    }

    return result
  }

  public truncate(): Promise<any> {
    return this.deps.resource.truncate()
  }
}
