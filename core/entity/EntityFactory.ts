import { types } from 'util'
import { AbstractEntity } from './AbstractEntity'
import { loggerNamespace } from '../logger/logger'
import { getCircularReplacer, JSONStringifySafe } from '../utils/common'
import { Cloner } from '../utils/clone/Cloner'

export interface IEntityFactory {
  create(data: unknown, clone: boolean): any
}

export class EntityFactory<T extends Record<string, any>, E extends AbstractEntity<T>> implements IEntityFactory {
  protected logger = loggerNamespace('EntityFactory')
  protected EntityClass: new () => E
  protected readonly cast?: (data: unknown) => T

  public constructor(EntityClass: new () => E, cast?: (data: unknown) => T) {
    this.EntityClass = EntityClass
    this.cast = cast
  }

  /**
   *
   * @param {unknown} data
   * @param {boolean} shouldClone
   * @return {E} The new Entity object
   *
   * @throws {Error} e
   */
  public create(data: unknown, shouldClone: boolean = true): E {
    const item = new this.EntityClass()

    try {
      if (shouldClone) {
        data = Cloner.getInstance().clone(data)
      }

      if (this.cast) {
        data = this.cast(data)
      }

      item.setData(<T>data, false)
    } catch (e: any) {
      if (types.isNativeError(e)) {
        this.logger.error(`Class [${this.EntityClass.name}]:`, e.message, JSONStringifySafe(data, getCircularReplacer()))
      }

      throw e
    }

    return item
  }
}
