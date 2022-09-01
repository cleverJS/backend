import { deserialize, serialize } from 'v8'

import { ICloner } from './ICloner'

export class V8Cloner implements ICloner {
  public clone(data: any): any {
    return deserialize(serialize(data))
  }
}
