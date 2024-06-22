import { Stream } from 'node:stream'

import { isInstanceOf } from '../common'
import { hasOwnMethods, isInstanceOfICloneable, isNonPrimitive } from '../reflect'

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
    if (isInstanceOfICloneable(data)) {
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
    if (!isNonPrimitive(obj) || isInstanceOf(obj, 'clone')) {
      return true
    }

    if (obj instanceof Date) {
      return true
    }

    if (obj instanceof Stream) {
      return false
    }

    if (obj instanceof Buffer) {
      return true
    }

    if (Array.isArray(obj)) {
      for (const item of obj) {
        if (!this.isCloneable(item)) {
          return false
        }
      }

      return true
    }

    if (obj instanceof Set) {
      for (const item of obj) {
        if (!this.isCloneable(item)) {
          return false
        }
      }

      return true
    }

    if (obj instanceof Map) {
      for (const [, item] of obj) {
        if (!this.isCloneable(item)) {
          return false
        }
      }

      return true
    }

    if (hasOwnMethods(obj)) {
      return false
    }

    for (const item of Object.values(obj)) {
      if (!this.isCloneable(item)) {
        return false
      }
    }

    return true
  }
}
