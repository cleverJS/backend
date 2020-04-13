import { Condition } from './Condition'
import { EntityFactory } from '../entity/EntityFactory'
import { AbstractEntity } from '../entity/AbstractEntity'

export abstract class AbstractResource<T extends AbstractEntity<Record<string, any>>> {
  protected entityFactory: EntityFactory<T>

  protected constructor(entityFactory: EntityFactory<T>) {
    this.entityFactory = entityFactory
  }

  public abstract findById(id: string): Promise<T | null>
  public abstract findOne(condition: Condition): Promise<T | null>
  public abstract findAll(condition: Condition): Promise<T[]>
  public abstract findAllRaw(condition: Condition): Promise<any[]>
  public abstract count(condition?: Condition): Promise<number | null>
  public abstract save(item: T): Promise<boolean>
  public abstract batchInsert(item: T[]): Promise<number[]>
  public abstract batchInsertRaw(rows: Record<string, any>[]): Promise<number[]>
  public abstract delete(id: string): Promise<boolean>
  public abstract deleteAll(condition: Condition): Promise<boolean>
  public abstract truncate(): Promise<any>
  public abstract createEntity(data: any): T
  public abstract map(data: Record<string, any>): any
  public abstract mapToDB(item: T): any
}
