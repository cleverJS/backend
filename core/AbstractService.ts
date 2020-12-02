import { AbstractResource } from './db/AbstractResource'
import { IEntity } from './entity/AbstractEntity'
import { Condition } from './db/Condition'
import { Paginator } from './utils/Paginator'

export abstract class AbstractService<E extends IEntity, R extends AbstractResource<E>> {
  protected resource: R

  public constructor(resource: R) {
    this.resource = resource
  }

  public findById(id: string | number): Promise<E | null> {
    return this.resource.findById(id)
  }

  public findOne(condition: Readonly<Condition>): Promise<E | null> {
    return this.resource.findOne(condition)
  }

  public findAll(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<E[]> {
    return this.resource.findAll(condition, paginator)
  }

  public findAllRaw(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<any[]> {
    return this.resource.findAllRaw(condition, paginator)
  }

  public count(condition?: Readonly<Condition>): Promise<number | null> {
    return this.resource.count(condition)
  }

  public delete(id: string | number): Promise<boolean> {
    return this.resource.delete(id)
  }

  public deleteAll(condition?: Readonly<Condition>): Promise<boolean> {
    return this.resource.deleteAll(condition)
  }

  public save(item: E): Promise<boolean> {
    return this.resource.save(item)
  }

  public createEntity(data: Partial<E>): E {
    return this.resource.createEntity(data)
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
    return this.resource.truncate()
  }
}
