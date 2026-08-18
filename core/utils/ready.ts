interface ILatch {
  readonly promise: Promise<boolean>
  settled: boolean
  resolve: (flag: boolean) => void
  reject: (error: Error) => void
}

/**
 * The latch is a self-contained object rather than a pair of fields reassigned on `Ready`: field initialisers
 * run before the constructor body, so the previous shape was one tidy-up away from having its real `resolve`
 * overwritten by the noop placeholder, which parks every waiter in the process forever with no error anywhere.
 */
const createLatch = (): ILatch => {
  let settle!: (flag: boolean) => void
  let fail!: (error: Error) => void

  const promise = new Promise<boolean>((resolve, reject) => {
    settle = resolve
    fail = reject
  })

  const latch: ILatch = {
    promise,
    settled: false,
    resolve: (flag: boolean) => {
      latch.settled = true
      settle(flag)
    },
    reject: (error: Error) => {
      latch.settled = true
      fail(error)
    },
  }

  // A latch is rejected from event handlers, i.e. precisely when no caller happens to be parked on it. Without
  // a handler of its own that is an unhandledRejection, and Node terminates the process by default.
  void promise.catch(() => {})

  return latch
}

export class Ready {
  protected latch: ILatch = createLatch()

  /** Whether the latch has settled, without parking on it. */
  public get settled(): boolean {
    return this.latch.settled
  }

  public resolve = (flag: boolean = true) => {
    this.latch.resolve(flag)
  }

  public reject = (error?: Error) => {
    this.latch.reject(error ?? new Error('Ready has been rejected'))
  }

  /** Releases whatever is parked on the current latch with `false`, then arms a fresh one. */
  public reset() {
    this.latch.resolve(false)
    this.latch = createLatch()
  }

  /**
   * @deprecated use wait instead
   */
  public async isReady(): Promise<boolean> {
    return this.latch.promise
  }

  public async isResolved(): Promise<boolean> {
    return this.latch.promise
  }

  /**
   * @param timeoutMS rejects once it passes; without it the wait is unbounded.
   */
  public async wait(timeoutMS?: number): Promise<boolean> {
    if (!timeoutMS) {
      return this.latch.promise
    }

    let timer: NodeJS.Timeout | undefined

    try {
      return await Promise.race([
        this.latch.promise,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`Ready has not settled within ${timeoutMS} ms`)), timeoutMS)
        }),
      ])
    } finally {
      clearTimeout(timer)
    }
  }

  /** @deprecated read `wait()`; kept so a 4.0.0 subclass reading `this.promise` keeps compiling. */
  protected get promise(): Promise<boolean> {
    return this.latch.promise
  }
}
