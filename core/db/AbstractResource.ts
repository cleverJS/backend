import { Condition } from './Condition'
import { AbstractObject } from '../AbstractObject'
import { EntityFactory } from '../entity/EntityFactory'
import { AbstractEntity } from '../entity/AbstractEntity'

export abstract class AbstractResource<T extends AbstractEntity<AbstractObject>> {
  protected entityFactory: EntityFactory<T>

  protected constructor(entityFactory: EntityFactory<T>) {
    this.entityFactory = entityFactory
  }

  public abstract findById(id: string): Promise<T | null>
  public abstract findOne(condition: Condition): Promise<T | null>
  public abstract findAll(condition: Condition): Promise<T[]>
  public abstract count(condition?: Condition): Promise<number | null>
  public abstract save(item: T): Promise<boolean>
  public abstract delete(id: string): Promise<boolean>
  public abstract deleteAll(condition: Condition): Promise<boolean>
  public abstract createEntity(data: any): T
  protected abstract map(data: AbstractObject): any
  protected abstract mapToDB(item: T): any
}
