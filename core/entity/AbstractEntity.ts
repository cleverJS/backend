import { logger } from '../logger/logger'
import { AbstractObject } from '../AbstractObject'

export abstract class AbstractEntity<T extends AbstractObject> {
  public id: string | number = ''

  public setData(data: T) {
    const properties: any = []
    if (data) {
      for (const key in data) {
        if (data.hasOwnProperty(key) && this.hasOwnProperty(key)) {
          const value = data[key]
          if (typeof value !== 'function') {
            properties[key] = data[key]
          }
        }
      }
    }

    Object.assign(this, properties)
  }

  public getData(): T {
    const data: any = {}
    for (const key in this) {
      if (this.hasOwnProperty(key)) {
        data[key] = this[key]
      }
    }

    return data
  }

  /**
   * @throws TypeError
   * @param data
   */
  public static cast(data: AbstractObject) {
    logger.error('Should be override for casting data', data)
    throw new Error('Should be override')
  }
}
