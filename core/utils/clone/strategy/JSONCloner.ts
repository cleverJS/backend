import { ICloner } from './ICloner'

export class JSONCloner implements ICloner {
  public clone<T>(data: T): T {
    return JSON.parse(JSON.stringify(data))
  }
}
