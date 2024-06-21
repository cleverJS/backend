import { isInstanceOf } from '../common'
import { hasOwnMethods, isNonPrimitive } from '../reflect'

import { ICloneable } from './ICloneable'
import { ICloner } from './strategy/ICloner'
import { V8Cloner } from './strategy/V8Cloner'

export class Cloner {
  private static instance: Cloner
  private cloner: ICloner

  private constructor() {
    this.cloner = new V8Cloner()
  }

  public static getInstance(): Cloner {
    if (!Cloner.instance) {
      Cloner.instance = new Cloner()
    }

    return Cloner.instance
  }

  public setCloner(cloner: ICloner) {
    this.cloner = cloner
  }

  public clone<T>(data: T): T {
    let result
    if (isInstanceOf<ICloneable>(data, 'clone')) {
      result = data.clone(data)
    } else {
      if (!Cloner.isCloneable(data)) {
        throw new Error('Non Cloneable object cannot be cached in Runtime, because it will lose its behaviour')
      }

      result = this.cloner.clone<T>(data)
    }

    return result
  }

  public static isCloneable(obj: any) {
    let result = true

    if (isNonPrimitive(obj) && !isInstanceOf(obj, 'clone')) {
      if (Array.isArray(obj)) {
        for (const item of obj) {
          if (!this.isCloneable(item)) {
            result = false
            break
          }
        }
      } else if (obj instanceof Set) {
        for (const item of obj) {
          if (!this.isCloneable(item)) {
            result = false
            break
          }
        }
      } else if (obj instanceof Map) {
        for (const [, item] of obj) {
          if (!this.isCloneable(item)) {
            result = false
            break
          }
        }
      } else if (hasOwnMethods(obj)) {
        result = false
      }
    }

    return result
  }
}
