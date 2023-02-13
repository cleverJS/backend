import { resolveMapWithPromise, resolveMapWithPromises } from '../../core/utils/promise'

describe('Test promise', () => {
  it('should resolve promise', async () => {
    const map: Map<number, Promise<number>> = new Map()
    map.set(1, Promise.resolve(1))
    map.set(2, Promise.resolve(2))

    const result = await resolveMapWithPromise(map)
    expect(result).toEqual([
      {
        id: 1,
        result: 1,
      },
      {
        id: 2,
        result: 2,
      },
    ])
  })

  it('should resolve promises', async () => {
    const map: Map<number, Promise<number>[]> = new Map()
    map.set(1, [Promise.resolve(1), Promise.resolve(2)])
    map.set(2, [Promise.resolve(3), Promise.resolve(4)])

    const result = await resolveMapWithPromises(map)
    expect(result).toEqual([
      {
        id: 1,
        result: [1, 2],
      },
      {
        id: 2,
        result: [3, 4],
      },
    ])
  })
})
