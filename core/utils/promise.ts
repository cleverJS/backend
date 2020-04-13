export const resolvePromiseMap = <K, V>(map: Map<K, Promise<V>>): Promise<{ id: K; item: V }[]> => {
  return Promise.all(
    Array.from(map, async ([id, promise]) => {
      return { id, item: await promise }
    })
  )
}
