import { types } from 'util'

import { loggerNamespace } from '../logger/logger'
import { Cloner } from '../utils/clone/Cloner'
import { getCircularReplacer, JSONStringifySafe } from '../utils/common'
import { TClass } from '../utils/types'

import { AbstractEntity } from './AbstractEntity'

export interface IEntityFactory {
  create(data: unknown, clone: boolean): Promise<any>
}

export class EntityFactory<GData extends Record<string, any>, GEntity extends AbstractEntity<GData>> implements IEntityFactory {
  protected logger = loggerNamespace('EntityFactory')
  protected EntityClass: new () => GEntity
  protected readonly cast?: (data: unknown) => Promise<GData>

  public constructor(EntityClass: TClass<GEntity>, cast?: (data: unknown) => Promise<GData>) {
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
  public async create(data: unknown, shouldClone: boolean = true): Promise<GEntity> {
    const item = new this.EntityClass()

    try {
      if (shouldClone) {
        data = Cloner.getInstance().clone(data)
      }

      if (this.cast) {
        data = await this.cast(data)
      }

      item.setData(<GData>data, false)
    } catch (e: any) {
      if (types.isNativeError(e)) {
        this.logger.error(`Class [${this.EntityClass.name}]:`, e.message, JSONStringifySafe(data, getCircularReplacer()))
      }

      throw new Error(e.message)
    }

    return item
  }
}
