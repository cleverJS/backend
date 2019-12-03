export const resolvePromisesObject = async (map: Map<string, Promise<any[]>>) => {
  return await Promise.all(
    Array.from(map, async ([name, promise]) => {
      return [name, await promise]
    })
  )
}

export const isInstanceOf = <T>(object: any, uniqueInstanceProperty: string): object is T => {
  return uniqueInstanceProperty in object
}
