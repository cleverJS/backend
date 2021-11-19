export class Ready {
  protected readonly promise: Promise<any>

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolve = () => {
        resolve(true)
      }
    })
  }

  public async isReady(): Promise<true> {
    return this.promise
  }

  public resolve = () => {}
}
