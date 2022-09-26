import { IEntity } from '../entity/AbstractEntity'
import { IEntityFactory } from '../entity/EntityFactory'
import { Paginator } from '../utils/Paginator'
import { TEntityFrom } from '../utils/types'

import { Condition } from './Condition'

export abstract class AbstractResource<E extends IEntity> {
  protected entityFactory: IEntityFactory

  protected constructor(entityFactory: IEntityFactory) {
    this.entityFactory = entityFactory
  }

  public abstract findById(id: string | number): Promise<E | null>
  public abstract findOne(condition: Readonly<Condition>): Promise<E | null>
  public abstract findAll(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<E[]>
  public abstract findAllRaw<T extends Record<string, any> = Record<string, any>>(
    condition?: Readonly<Condition>,
    paginator?: Readonly<Paginator>,
    select?: string[]
  ): Promise<T[]>
  public abstract count(condition?: Readonly<Condition>): Promise<number>
  public abstract delete(id: string | number): Promise<boolean>
  public abstract deleteAll(condition?: Readonly<Condition>): Promise<boolean>
  public abstract save(item: E): Promise<boolean>
  public abstract insert(data: Partial<TEntityFrom<E>>): Promise<any | null>
  public abstract update(condition: Readonly<Condition>, data: Partial<TEntityFrom<E>>): Promise<boolean>
  public abstract batchInsert(item: E[], chunkSize?: number): Promise<string[] | number[] | any>
  public abstract batchInsertRaw(rows: Partial<TEntityFrom<E>>[], chunkSize?: number): Promise<string[] | number[] | any>
  public abstract truncate(): Promise<any>
  public abstract createEntity(data: Partial<TEntityFrom<E>>, clone: boolean): Promise<E>
  public abstract map(data: Record<string, any>): any
  public abstract mapToDB(item: E): any
}
