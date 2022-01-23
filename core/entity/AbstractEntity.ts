import { Cloner } from '../utils/clone/Cloner'

export interface IEntity {
  id?: number | string | null
  setData(data: any, clone: boolean): void
  getData(clone?: boolean): any
}

export abstract class AbstractEntity<T extends Record<string, any>> implements IEntity {
  public id?: number | string | null

  public setData(data: Partial<T>, shouldClone: boolean = true): void {
    if (shouldClone) {
      data = Cloner.getInstance().clone(data)
    }
    const properties: any = []
    const dataKeyList: string[] = Object.keys(data)
    for (let i = 0; i < dataKeyList.length; i++) {
      const key: string = dataKeyList[i]

      if (key === 'id' || key in this) {
        properties[key] = data[key]
      } else {
        throw new Error(`Attempt to assign non class property ${key}`)
      }
    }

    Object.assign(this, properties)
  }

  public getData(shouldClone: boolean = true): T {
    const data: any = {}
    // eslint-disable-next-line guard-for-in
    for (const key in this) {
      data[key] = this[key]
    }

    return shouldClone ? Cloner.getInstance().clone(data) : data
  }
}
