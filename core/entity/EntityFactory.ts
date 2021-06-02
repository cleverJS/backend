import { AbstractEntity } from './AbstractEntity'
import { loggerNamespace } from '../logger/logger'
import { JSONStringifySafe } from '../utils/common'

export interface IEntityFactory {
  create(data: unknown): any
}

export class EntityFactory<T extends Record<string, any>, E extends AbstractEntity<T>> implements IEntityFactory {
  protected logger = loggerNamespace('EntityFactory')
  protected EntityClass: new () => E
  protected readonly cast?: (data: unknown) => T

  public constructor(EntityClass: new () => E, cast?: (data: unknown) => T) {
    this.EntityClass = EntityClass
    this.cast = cast
  }

  public create(data: unknown): E {
    const item = new this.EntityClass()

    try {
      if (this.cast) {
        data = this.cast(data)
      }

      item.setData(data as T)
    } catch (e) {
      this.logger.error(`Class [${this.EntityClass.name}]:`, e.message, JSONStringifySafe(data))
      throw e
    }

    return item
  }
}
