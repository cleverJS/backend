import path from 'path'
import hrtime from 'pretty-hrtime'
import { fileURLToPath } from 'url'

export const CORE_DEBUG = (process.env.CORE_DEBUG || 'false') === 'true'

export const isInstanceOf = <T>(object: any, condition: string | ((object: any) => boolean)): object is T => {
  if (typeof condition === 'string') {
    return condition in object
  }

  return condition(object)
}

export const isInstanceOfByCondition = <T>(object: any, condition: (object: any) => boolean): object is T => {
  return isInstanceOf<T>(object, condition)
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

export function JSONStringifySafe(
  json: any,
  replacer?: (this: any, key: string, value: any) => any | (number | string)[] | null,
  space?: string | number
): string {
  let result = ''
  try {
    result = JSON.stringify(json, replacer, space)
  } catch (e) {
    // Nothing to do
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

export function argsStringify(...args: any[]) {
  const space = ' '
  const carryover = '\n'

  return args.reduce((prev, current, index) => {
    const isBeginning = index === 0

    let messageNext = prev
    try {
      if (['string', 'number', 'boolean', 'bigint', 'undefined'].includes(typeof current)) {
        messageNext += `${!isBeginning ? space : ''}${current}`
      } else if (current instanceof Error) {
        const { stack, ...other } = current
        messageNext += `${!isBeginning ? carryover : ''}${JSON.stringify(other)}\n`
        messageNext += `${!isBeginning ? carryover : ''}[Stack trace]: ${stack}`
      } else if (typeof current === 'function') {
        messageNext += `${!isBeginning ? carryover : ''}[Function]`
      } else {
        messageNext += `${!isBeginning ? carryover : ''}${JSON.stringify(current, null, 4)}`
      }
    } catch (e) {
      messageNext += `${!isBeginning ? carryover : ''}${JSONStringifySafe(current, getCircularReplacer(), 4)}`
    }

    return messageNext
  }, '')
}

export function getCircularReplacer() {
  const seen = new WeakSet()
  return function (key: string, value: any) {
    if (typeof value === 'object' && value !== null) {
      if (seen.has(value)) {
        return '[Circular Object]'
      }
      seen.add(value)
    }

    return value
  }
}

export function chunkString(input: string, length: number) {
  const numChunks = Math.ceil(input.length / length)
  const chunks = new Array(numChunks)

  for (let i = 0, j = 0; i < numChunks; ++i, j += length) {
    chunks[i] = input.substring(j, j + length)
  }

  return chunks
}

export function currentDir(importMetaUrl: string) {
  const currentFilename = fileURLToPath(importMetaUrl)
  return path.dirname(currentFilename)
}

export async function onlyProduction<T>(callback: () => Promise<T | null>) {
  if (process.env.NODE_ENV === 'production') {
    return callback()
  }

  return null
}

export async function timer<T>(callback: () => Promise<T>, logger: any, message: string) {
  const startCommand = process.hrtime()
  const result = await callback()
  const endCommand = process.hrtime(startCommand)
  const wordsCommand = hrtime(endCommand)

  logger.info(`[${wordsCommand}] ${message}`)
  return result
}
