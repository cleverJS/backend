import { AbstractResource } from './db/AbstractResource'
import { Condition } from './db/Condition'
import { IEntity } from './entity/AbstractEntity'
import { Paginator } from './utils/Paginator'
import { TEntityFrom } from './utils/types'

export abstract class AbstractService<E extends IEntity, R extends AbstractResource<E>> {
  protected resource: R

  public constructor(resource: R) {
    this.resource = resource
  }

  public async findById(id: string | number): Promise<E | null> {
    return this.resource.findById(id)
  }

  public async findOne(condition: Readonly<Condition>): Promise<E | null> {
    return this.resource.findOne(condition)
  }

  public async findAll(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<E[]> {
    return this.resource.findAll(condition, paginator)
  }

  public async findAllRaw<T extends Record<string, any> = Record<string, any>>(
    condition?: Readonly<Condition>,
    paginator?: Readonly<Paginator>,
    select?: string[]
  ): Promise<T[]> {
    return this.resource.findAllRaw<T>(condition, paginator, select)
  }

  public async count(condition?: Readonly<Condition>): Promise<number> {
    return this.resource.count(condition)
  }

  public delete(id: string | number): Promise<boolean> {
    return this.resource.delete(id)
  }

  public deleteAll(condition?: Readonly<Condition>): Promise<boolean> {
    return this.resource.deleteAll(condition)
  }

  public async save(item: E): Promise<boolean> {
    return this.resource.save(item)
  }

  public createEntity(data: Partial<TEntityFrom<E>>, clone: boolean = true): Promise<E> {
    return this.resource.createEntity(data, clone)
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

  public async listRaw<T extends Record<string, any> = Record<string, any>>(
    paginator: Readonly<Paginator>,
    condition?: Readonly<Condition>,
    select?: string[]
  ): Promise<T[]> {
    const total = paginator.getTotal()
    let totalPromise
    if (!total && !paginator.isSkipTotal()) {
      totalPromise = this.count(condition)
    }

    const resultPromise = this.findAllRaw<T>(condition, paginator, select)

    const [result, totalNext] = await Promise.all([resultPromise, totalPromise])

    if (!total && !paginator.isSkipTotal()) {
      paginator.setTotal(totalNext || 0)
    }

    return result as T[]
  }

  public async truncate(): Promise<any> {
    return this.resource.truncate()
  }
}
