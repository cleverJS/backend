import { ICloner } from './ICloner'

export class JSONCloner implements ICloner {
  public clone<T>(data: T): T {
    const cloned = JSON.parse(JSON.stringify(data))
    return this.restoreTypes(data, cloned)
  }

  private restoreTypes(data: any, cloned: any) {
    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        cloned[key] = new Date(cloned[key])
      }

      if (value instanceof Buffer) {
        cloned[key] = Buffer.from(cloned[key])
      }
    }

    return cloned
  }
}
