export interface IEntity {
  id?: number | string | null
  setData(data: any): void
  getData(): any
}

export abstract class AbstractEntity<T extends Record<string, any>> implements IEntity {
  public id?: number | string | null

  public setData(data: T): void {
    const properties: any = []
    const dataKeyList: string[] = Object.keys(data)
    for (let i = 0; i < dataKeyList.length; i++) {
      const key: string = dataKeyList[i]

      if (key === 'id' || key in this) {
        properties[key] = data[key]
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
}
