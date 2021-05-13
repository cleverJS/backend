export const CORE_DEBUG = (process.env.CORE_DEBUG || 'false') === ' true'

export const isInstanceOf = <T>(object: any, uniqueInstanceProperty: string): object is T => {
  return uniqueInstanceProperty in object
}

export const chunkArray = <T = any>(array: T[], size: number): T[][] => {
  const results = []

  if (array.length > size) {
    while (array.length) {
      results.push(array.splice(0, size))
    }
  } else {
    results.push(array)
  }

  return results
}

export const arrayUnique = <T = any>(arr: T[]): T[] => {
  return Array.from(new Set(arr))
}
