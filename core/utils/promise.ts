export const resolveMapWithPromise = <K, V>(map: Map<K, Promise<V>>): Promise<{ id: K; result: V }[]> => {
  return Promise.all(
    Array.from(map, async ([id, promise]) => {
      return { id, result: await promise }
    })
  )
}

export const resolveMapWithPromises = <K, V>(map: Map<K, Promise<V>[]>): Promise<{ id: K; result: V[] }[]> => {
  return Promise.all(
    Array.from(map, async ([id, promise]) => {
      return { id, result: await Promise.all(promise) }
    })
  )
}
