import { Paginator } from '../utils/Paginator'
import { TEntityFrom } from '../utils/types'

import { Condition } from './Condition'

export abstract class AbstractResource<E> {
  public abstract findById(id: string | number, connection?: unknown): Promise<E | null>
  public abstract findOne(condition: Readonly<Condition>, connection?: unknown): Promise<E | null>
  public abstract findAll(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>, connection?: unknown): Promise<E[]>
  public abstract findAllRaw<T extends Record<string, any> = Record<string, any>>(
    condition?: Readonly<Condition>,
    paginator?: Readonly<Paginator>,
    select?: string[],
    connection?: unknown
  ): Promise<T[]>
  public abstract count(condition?: Readonly<Condition>, connection?: unknown): Promise<number>
  public abstract save(item: E, connection?: unknown): Promise<boolean>
  public abstract insert(data: Partial<TEntityFrom<E>>, connection?: unknown): Promise<any | null>
  public abstract update(condition: Readonly<Condition>, data: Partial<TEntityFrom<E>>, connection?: unknown): Promise<boolean>
  public abstract delete(id: string | number, requestor?: string, connection?: unknown): Promise<boolean>
  public abstract deleteAll(condition: Readonly<Condition>, requestor?: string, connection?: unknown): Promise<boolean>
  public abstract batchInsert(item: E[], chunkSize?: number, connection?: unknown): Promise<string[] | number[] | any>
  public abstract batchInsertRaw(data: Partial<TEntityFrom<E>>[], chunkSize?: number, connection?: unknown): Promise<string[] | number[] | any>
  public abstract truncate(requestor?: string, connection?: unknown): Promise<any>
  public abstract createEntity(data: Partial<TEntityFrom<E>>, clone: boolean): Promise<E>
  public abstract map(data: Record<string, any>): any
  public abstract mapToDB(item: E): any
}
