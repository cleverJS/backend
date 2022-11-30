import { logger } from '../logger/logger'
import { Cloner } from '../utils/clone/Cloner'

export interface IEntity {
  id?: number | string | null
  setData(data: Partial<any>, shouldClone?: boolean): void
  getData(shouldClone?: boolean): any
  clone(nextData?: Partial<any>): IEntity
}

export abstract class AbstractEntity<GData extends Record<string, any>, GID extends number | string | null = number | null> implements IEntity {
  public id?: GID

  public constructor(data?: Partial<GData>) {
    if (data) {
      this.setData(data)
    }
  }

  public setData(data: Partial<GData>, shouldClone: boolean = true): void {
    if (shouldClone) {
      data = Cloner.getInstance().clone(data)
    }

    const properties: any = []
    const dataKeyList: string[] = Object.keys(data)
    for (let i = 0; i < dataKeyList.length; i++) {
      const key: string = dataKeyList[i]

      if (key === 'id' || key in this) {
        properties[key] = data[key]
      } else if (process.env.CORE_DEBUG) {
        logger.debug(`[AbstractEntity:${this.constructor.name}] Non class property ${key}. Skipped`)
      }
    }

    Object.assign(this, properties)
  }

  public getData(shouldClone: boolean = true): GData {
    const data: any = {}
    // eslint-disable-next-line guard-for-in
    for (const key in this) {
      data[key] = this[key]
    }

    return shouldClone ? Cloner.getInstance().clone(data) : data
  }

  public clone(nextData?: Partial<GData>) {
    const instance = new (this.constructor as new (data?: Partial<GData>) => this)()
    let data = this.getData(false)
    if (nextData) {
      data = { ...data, ...nextData }
    }

    instance.setData(data, true)
    return instance
  }
}
