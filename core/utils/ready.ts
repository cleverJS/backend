export class Ready {
  protected promise: Promise<boolean>

  constructor() {
    this.promise = this.getPromise()
  }

  public reset() {
    this.resolve(false)
    this.promise = this.getPromise()
  }

  /**
   * @deprecated use isResolved instead
   */
  public async isReady(): Promise<boolean> {
    return this.promise
  }

  public async isResolved(): Promise<boolean> {
    return this.promise
  }

  public resolve = (flag: boolean = true) => {}
  public reject = () => {}

  protected getPromise() {
    return new Promise<boolean>((resolve, reject) => {
      this.resolve = (flag: boolean = true) => {
        resolve(flag)
      }

      this.reject = () => {
        reject(false)
      }
    })
  }
}
