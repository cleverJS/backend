import { AbstractEntity } from './AbstractEntity'
import { AbstractObject } from '../AbstractObject'

export class EntityFactory<T extends AbstractEntity<AbstractObject>> {
  protected EntityClass: new () => T
  protected cast: (data: AbstractObject) => AbstractObject

  public constructor(EntityClass: new () => T, cast: (data: AbstractObject) => AbstractObject) {
    this.EntityClass = EntityClass
    this.cast = cast
  }

  public create(data: AbstractObject): T {
    const item = new this.EntityClass()
    item.setData(this.cast(data))
    return item
  }
}
