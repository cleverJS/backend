export class Ready {
  public resolved: boolean = false
  public readonly promise: Promise<any>

  constructor() {
    this.promise = new Promise((resolve) => {
      this.resolve = () => {
        resolve(true)
        this.resolved = true
      }
    })
  }

  public resolve = () => {}
}
