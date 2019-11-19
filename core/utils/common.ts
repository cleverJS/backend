export const resolvePromisesObject = async (map: Map<string, Promise<any[]>>) => {
  return await Promise.all(
    Array.from(map, async ([name, promise]) => {
      return [name, await promise]
    })
  )
}
