import { AbstractResource } from './db/AbstractResource'
import { Condition } from './db/Condition'
import { IEntity } from './entity/AbstractEntity'
import { Paginator } from './utils/Paginator'
import { TEntityFrom } from './utils/types'

export abstract class AbstractService<GEntity extends IEntity, GResource extends AbstractResource<GEntity>> {
  protected resource: GResource

  public constructor(resource: GResource) {
    this.resource = resource
  }

  public async findById(id: string | number): Promise<GEntity | null> {
    return this.resource.findById(id)
  }

  public async findOne(condition: Readonly<Condition>): Promise<GEntity | null> {
    return this.resource.findOne(condition)
  }

  public async findAll(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<GEntity[]> {
    return this.resource.findAll(condition, paginator)
  }

  public async findAllRaw<GRaw extends Record<string, any> = Record<string, any>>(
    condition?: Readonly<Condition>,
    paginator?: Readonly<Paginator>,
    select?: string[]
  ): Promise<GRaw[]> {
    return this.resource.findAllRaw<GRaw>(condition, paginator, select)
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

  public async save(item: GEntity): Promise<boolean> {
    return this.resource.save(item)
  }

  public async upsert(item: GEntity, condition?: Condition): Promise<boolean> {
    let entity

    if (condition) {
      entity = await this.findOne(condition)
    } else if (item.id) {
      entity = await this.findById(item.id)
    }

    const data = item.getData()
    const primaryKey = this.resource.getPrimaryKey()
    const { id, [primaryKey]: ident, ...impersonalData } = data

    if (entity) {
      entity.setData(impersonalData)
    } else {
      entity = await this.createEntity(impersonalData)
    }

    const result = await this.save(entity)

    if (result) {
      item.setData(entity.getData(false))
    }

    return result
  }

  public createEntity(data: Partial<TEntityFrom<GEntity>>, clone: boolean = true): Promise<GEntity> {
    return this.resource.createEntity(data, clone)
  }

  public async list(paginator: Readonly<Paginator>, condition?: Readonly<Condition>): Promise<GEntity[]> {
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
