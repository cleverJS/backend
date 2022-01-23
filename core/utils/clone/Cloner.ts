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
    return this.cloner.clone<T>(data)
  }
}
