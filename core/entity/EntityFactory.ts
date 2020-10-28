import { AbstractEntity } from './AbstractEntity'

export class EntityFactory<T extends AbstractEntity<Record<string, any>>> {
  protected EntityClass: new () => T
  public readonly cast: (data: Record<string, any>) => Record<string, any>

  public constructor(EntityClass: new () => T, cast: (data: Record<string, any>) => Record<string, any>) {
    this.EntityClass = EntityClass
    this.cast = cast
  }

  public create(data: Record<string, any>): T {
    const item = new this.EntityClass()
    item.setData(this.cast(data))
    return item
  }
}
