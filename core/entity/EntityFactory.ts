import { AbstractEntity } from './AbstractEntity'

export interface IEntityFactory {
  create(data: unknown): any
}

export class EntityFactory<T extends Record<string, any>, E extends AbstractEntity<T>> implements IEntityFactory {
  protected EntityClass: new () => E
  protected readonly cast?: (data: unknown) => T

  public constructor(EntityClass: new () => E, cast?: (data: unknown) => T) {
    this.EntityClass = EntityClass
    this.cast = cast
  }

  public create(data: unknown): E {
    const item = new this.EntityClass()
    if (this.cast) {
      data = this.cast(data)
    }

    item.setData(data as T)
    return item
  }
}
