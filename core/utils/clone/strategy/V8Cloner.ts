import { deserialize, serialize } from 'v8'

import { ICloner } from './ICloner'

export class V8Cloner implements ICloner {
  public clone<T>(data: T): T {
    const cloned = deserialize(serialize(data))
    return this.restoreTypes(data, cloned)
  }

  private restoreTypes(data: any, cloned: any) {
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        cloned[key] = new Date(cloned[key])
      }
    }

    return cloned
  }
}
