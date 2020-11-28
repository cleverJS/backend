import { AbstractResource } from './db/AbstractResource'
import { IEntity } from './entity/AbstractEntity'
import { Condition } from './db/Condition'
import { Paginator } from './utils/Paginator'

export interface IDependencies<E extends IEntity> {
  resource: AbstractResource<E>
}

export abstract class AbstractService<E extends IEntity> {
  protected deps: IDependencies<E>

  public constructor(deps: IDependencies<E>) {
    this.deps = deps
  }

  public findById(id: string | number): Promise<E | null> {
    return this.deps.resource.findById(id)
  }

  public findOne(condition: Readonly<Condition>): Promise<E | null> {
    return this.deps.resource.findOne(condition)
  }

  public findAll(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<E[]> {
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

  public save(item: E): Promise<boolean> {
    return this.deps.resource.save(item)
  }

  public createEntity(data: Partial<E>): E {
    return this.deps.resource.createEntity(data)
  }

  public async list(paginator: Readonly<Paginator>, condition?: Readonly<Condition>): Promise<E[]> {
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

  public async listRaw(paginator: Readonly<Paginator>, condition?: Readonly<Condition>): Promise<Record<string, any>[]> {
    const total = paginator.getTotal()
    let totalPromise
    if (!total && !paginator.isSkipTotal()) {
      totalPromise = this.count(condition)
    }

    const resultPromise = this.findAllRaw(condition, paginator)

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
