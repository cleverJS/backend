import { Ready } from '../../core/utils/ready'

const PENDING = Symbol('pending')

/**
 * A settled promise wins this race deterministically: its continuation is a microtask and `setImmediate` is a
 * macrotask, so the ordering is guaranteed by the spec rather than by a timing margin. This is how "the latch
 * is still closed" is proven without a sleep.
 */
const raceWithTick = async <T>(promise: Promise<T>): Promise<T | typeof PENDING> =>
  Promise.race([
    promise,
    new Promise<typeof PENDING>((resolve) => {
      setImmediate(() => resolve(PENDING))
    }),
  ])

/**
 * `unhandledRejection` is emitted after the microtask queue drains at the end of a turn, so crossing two
 * macrotask boundaries is what makes "no rejection escaped" an assertion instead of a coincidence.
 */
const flushRejectionBookkeeping = async (): Promise<void> => {
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
  await new Promise<void>((resolve) => {
    setImmediate(resolve)
  })
}

describe('Ready', () => {
  test('releases a waiter that arrives after resolve()', async () => {
    const ready = new Ready()

    ready.resolve()

    expect(await ready.isResolved()).toEqual(true)
  })

  test('releases a waiter that parked before resolve()', async () => {
    const ready = new Ready()
    const waiting = ready.isResolved()

    expect(await raceWithTick(waiting)).toEqual(PENDING)

    ready.resolve()

    expect(await waiting).toEqual(true)
  })

  test('releases every concurrent waiter from a single resolve()', async () => {
    const ready = new Ready()
    const waiters = [ready.isResolved(), ready.isResolved(), ready.isResolved()]

    ready.resolve()

    expect(await Promise.all(waiters)).toEqual([true, true, true])
  })

  /**
   * The guard against the whole class being silently disarmed. `resolve` and `reject` are public fields, so
   * their initialisers run *before* the constructor body; moving the promise into a field initialiser above
   * them — an entirely reasonable-looking tidy-up — makes the noop initialiser overwrite the real `resolve`,
   * and every waiter in the process then parks forever with no error anywhere.
   */
  test('resolve() works in the same tick the instance is constructed', async () => {
    const ready = new Ready()
    ready.resolve()

    expect(ready.settled).toEqual(true)
    expect(await raceWithTick(ready.isResolved())).toEqual(true)
  })

  test('carries the flag passed to resolve()', async () => {
    const ready = new Ready()

    ready.resolve(false)

    expect(await ready.isResolved()).toEqual(false)
  })

  test('keeps the first value when resolve() is called twice', async () => {
    const ready = new Ready()

    ready.resolve(true)
    ready.resolve(false)

    expect(await ready.isResolved()).toEqual(true)
  })

  // The deprecation is the point of the test: `isReady` is exported API and has to keep working.
  /* eslint-disable sonarjs/deprecation */
  test('the deprecated isReady() waits on the same latch as isResolved()', async () => {
    const ready = new Ready()
    const deprecated = ready.isReady()

    ready.resolve()

    expect(await deprecated).toEqual(true)
    expect(await ready.isReady()).toEqual(true)
  })
  /* eslint-enable sonarjs/deprecation */

  describe('settled', () => {
    test('reports the state without waiting on it', () => {
      const ready = new Ready()

      expect(ready.settled).toEqual(false)

      ready.resolve()

      expect(ready.settled).toEqual(true)
    })

    test('reports a rejected latch as settled', async () => {
      const ready = new Ready()
      const waiting = ready.isResolved()

      ready.reject()

      await expect(waiting).rejects.toThrow()
      expect(ready.settled).toEqual(true)
    })

    test('reports false again after a reset()', () => {
      const ready = new Ready()
      ready.resolve()

      ready.reset()

      expect(ready.settled).toEqual(false)
    })
  })

  describe('reset', () => {
    /**
     * The behaviour `WSClient` needs on a dropped connection: an already-open gate has to close again, or
     * everything parked behind it sails straight through to a socket that is no longer there.
     */
    test('re-arms the latch so the next waiter blocks until the next resolve()', async () => {
      const ready = new Ready()
      ready.resolve()

      ready.reset()
      const waiting = ready.isResolved()

      expect(await raceWithTick(waiting)).toEqual(PENDING)

      ready.resolve()

      expect(await waiting).toEqual(true)
    })

    test('releases waiters parked across a reset() with false', async () => {
      const ready = new Ready()
      const waiting = ready.isResolved()

      ready.reset()

      expect(await waiting).toEqual(false)
    })

    test('re-arms a rejected latch', async () => {
      const ready = new Ready()
      ready.reject()
      await expect(ready.isResolved()).rejects.toThrow()

      ready.reset()
      const waiting = ready.isResolved()
      ready.resolve()

      expect(await waiting).toEqual(true)
    })

    test('does not leak an unhandled rejection when it re-arms a rejected latch nobody waited on', async () => {
      const unhandled: unknown[] = []
      const record = (reason: unknown) => unhandled.push(reason)
      process.on('unhandledRejection', record)

      try {
        const ready = new Ready()
        ready.reject()
        ready.reset()
        await flushRejectionBookkeeping()

        expect(unhandled).toEqual([])
      } finally {
        process.off('unhandledRejection', record)
      }
    })
  })

  describe('reject', () => {
    test('rejects waiters with an Error carrying the reason', async () => {
      const ready = new Ready()
      const waiting = ready.isResolved()
      const cause = new Error('connect ECONNREFUSED')

      ready.reject(cause)

      await expect(waiting).rejects.toThrow(cause)
    })

    test('rejects with an Error even when called with no argument', async () => {
      const ready = new Ready()
      const waiting = ready.isResolved()

      ready.reject()

      await expect(waiting).rejects.toBeInstanceOf(Error)
    })

    /**
     * The defect this guards is process-fatal, not cosmetic: a latch nobody happens to be waiting on at the
     * moment it fails produces an unhandled rejection, and Node terminates the process by default. A
     * connection gate is rejected from an event handler precisely when no caller is parked on it.
     */
    test('does not surface an unhandled rejection when nobody is waiting', async () => {
      const unhandled: unknown[] = []
      const record = (reason: unknown) => unhandled.push(reason)
      process.on('unhandledRejection', record)

      try {
        const ready = new Ready()
        ready.reject(new Error('nobody is listening'))
        await flushRejectionBookkeeping()

        expect(unhandled).toEqual([])
      } finally {
        process.off('unhandledRejection', record)
      }
    })

    test('is a no-op once the latch has resolved', async () => {
      const ready = new Ready()
      ready.resolve()

      ready.reject(new Error('too late'))

      expect(await ready.isResolved()).toEqual(true)
    })
  })

  describe('wait', () => {
    test('returns the value when the latch resolves in time', async () => {
      const ready = new Ready()
      const waiting = ready.wait(1000)

      ready.resolve()

      expect(await waiting).toEqual(true)
    })

    test('rejects when the latch stays closed past the timeout', async () => {
      const ready = new Ready()

      await expect(ready.wait(10)).rejects.toThrow(/10 ms/)
    })

    test('waits indefinitely when no timeout is given', async () => {
      const ready = new Ready()

      expect(await raceWithTick(ready.wait())).toEqual(PENDING)

      ready.resolve()
    })

    /**
     * A timer left armed after the latch resolves holds the event loop open for the whole timeout — on a
     * connection gate that is a process that will not exit for a minute after its work is done.
     */
    test('clears its timer once the latch resolves', async () => {
      vi.useFakeTimers()

      try {
        const ready = new Ready()
        const waiting = ready.wait(60000)
        ready.resolve()

        expect(await waiting).toEqual(true)
        expect(vi.getTimerCount()).toEqual(0)
      } finally {
        vi.useRealTimers()
      }
    })
  })
})
