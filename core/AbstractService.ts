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

  public findById(id: string | number): Promise<T | null> {
    return this.deps.resource.findById(id)
  }

  public findOne(condition: Readonly<Condition>): Promise<T | null> {
    return this.deps.resource.findOne(condition)
  }

  public findAll(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<T[]> {
    return this.deps.resource.findAll(condition, paginator)
  }

  public findAllRaw(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<any[]> {
    return this.deps.resource.findAllRaw(condition, paginator)
  }

  public count(condition?: Readonly<Condition>): Promise<number | null> {
    return this.deps.resource.count(condition)
  }

  public delete(id: string | number): Promise<boolean> {
    return this.deps.resource.delete(id)
  }

  public deleteAll(condition?: Readonly<Condition>): Promise<boolean> {
    return this.deps.resource.deleteAll(condition)
  }

  public save(item: T): Promise<boolean> {
    return this.deps.resource.save(item)
  }

  public createEntity(data: Partial<T>): T {
    return this.deps.resource.createEntity(data)
  }

  public async list(paginator: Readonly<Paginator>, condition: Readonly<Condition>): Promise<T[]> {
    const total = paginator.getTotal()
    let totalPromise
    if (!total && !paginator.isSkipTotal()) {
      totalPromise = this.count(condition)
    }

    const resultPromise = this.findAll(condition, paginator)

    const [result, totalNext] = await Promise.all([resultPromise, totalPromise])

    if (!total && !paginator.isSkipTotal()) {
      paginator.setTotal(totalNext || 0)
    }

    return result
  }

  public async listRaw(paginator: Readonly<Paginator>, condition: Readonly<Condition>): Promise<Record<string, any>[]> {
    const total = paginator.getTotal()
    let totalPromise
    if (!total && !paginator.isSkipTotal()) {
      totalPromise = this.count(condition)
    }

    const resultPromise = this.findAllRaw(condition)

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
