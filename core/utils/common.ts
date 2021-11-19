export const CORE_DEBUG = (process.env.CORE_DEBUG || 'false') === 'true'

export const isInstanceOf = <T>(object: any, uniqueInstanceProperty: string): object is T => {
  return uniqueInstanceProperty in object
}

export function sliceLast<T>(items: T[], n: number): T[] {
  return items.slice(Math.max(items.length - n, 0))
}

export function getLastItem<T>(items: T[]): T | undefined {
  return items && items.length ? items[items.length - 1] : undefined
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

export function JSONStringifySafe(json: unknown): string | null {
  let result = null
  try {
    result = JSON.stringify(json)
  } catch (e) {
    // Nothing todo
  }

  return result
}

export function formatBytes(bytes: number): string {
  const marker = 1024 // Change to 1000 if required
  const decimal = 3 // Change as required
  const kiloBytes = marker // One Kilobyte is 1024 bytes
  const megaBytes = marker * marker // One MB is 1024 KB
  const gigaBytes = marker * marker * marker // One GB is 1024 MB
  // const teraBytes = marker * marker * marker * marker // One TB is 1024 GB

  const absBytes = Math.abs(bytes)
  // return bytes if less than a KB
  if (absBytes < kiloBytes) return `${bytes} Bytes`
  // return KB if less than a MB
  if (absBytes < megaBytes) return `${(bytes / kiloBytes).toFixed(decimal)} KB`
  // return MB if less than a GB
  if (absBytes < gigaBytes) return `${(bytes / megaBytes).toFixed(decimal)} MB`
  // return GB if less than a TB
  return `${(bytes / gigaBytes).toFixed(decimal)} GB`
}
