import { Condition } from './Condition'
import { IEntityFactory } from '../entity/EntityFactory'
import { IEntity } from '../entity/AbstractEntity'
import { Paginator } from '../utils/Paginator'

export abstract class AbstractResource<E extends IEntity> {
  protected entityFactory: IEntityFactory

  protected constructor(entityFactory: IEntityFactory) {
    this.entityFactory = entityFactory
  }

  public abstract findById(id: string | number): Promise<E | null>
  public abstract findOne(condition: Readonly<Condition>): Promise<E | null>
  public abstract findAll(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<E[]>
  public abstract findAllRaw(condition?: Readonly<Condition>, paginator?: Readonly<Paginator>): Promise<any[]>
  public abstract count(condition?: Readonly<Condition>): Promise<number | null>
  public abstract delete(id: string | number): Promise<boolean>
  public abstract deleteAll(condition?: Readonly<Condition>): Promise<boolean>
  public abstract save(item: E): Promise<boolean>
  public abstract batchInsert(item: E[], chunkSize?: number): Promise<string[] | number[] | any>
  public abstract batchInsertRaw(rows: Record<string, any>[], chunkSize?: number): Promise<string[] | number[] | any>
  public abstract truncate(): Promise<any>
  public abstract createEntity(data: unknown): E
  public abstract map(data: Record<string, any>): any
  public abstract mapToDB(item: E): any
}
