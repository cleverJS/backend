import { types } from 'util'
import { AbstractEntity } from './AbstractEntity'
import { loggerNamespace } from '../logger/logger'
import { getCircularReplacer, JSONStringifySafe } from '../utils/common'
import { Cloner } from '../utils/clone/Cloner'

export interface IEntityFactory {
  create(data: unknown, clone: boolean): Promise<any>
}

export class EntityFactory<T extends Record<string, any>, E extends AbstractEntity<T>> implements IEntityFactory {
  protected logger = loggerNamespace('EntityFactory')
  protected EntityClass: new () => E
  protected readonly cast?: (data: unknown) => Promise<T>

  public constructor(EntityClass: new () => E, cast?: (data: unknown) => Promise<T>) {
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
  public async create(data: unknown, shouldClone: boolean = true): Promise<E> {
    const item = new this.EntityClass()

    try {
      if (shouldClone) {
        data = Cloner.getInstance().clone(data)
      }

      if (this.cast) {
        data = await this.cast(data)
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
