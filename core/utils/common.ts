import path from 'path'
import hrtime from 'pretty-hrtime'
import { fileURLToPath } from 'url'

import { logger } from '../logger/logger'

import { isoDateRegex, stringifiedObject } from './regexp'

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
  // return KB if less than an MB
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
    const preString = `${!isBeginning ? carryover : ''}`

    function errorToString(e: Error) {
      let result = ''

      const { stack, ...other } = e
      if (!isEmptyObject(other)) {
        result += `${preString}${JSON.stringify(other)}\n`
      }

      result += `${preString}[Stack trace]: ${stack}`

      return result
    }

    let messageNext = prev
    try {
      if (['string', 'number', 'boolean', 'bigint', 'undefined'].includes(typeof current)) {
        messageNext += `${!isBeginning ? space : ''}${current}`
      } else if (current instanceof AggregateError) {
        const { stack, errors, message } = current
        if (stack) {
          messageNext += `${ preString }[Stack trace]: ${ stack }\n`
        }

        if (message) {
          messageNext += `\t${preString}${message}\n`
        }

        if (errors && errors.length) {
          for (const error of errors) {
            if (error instanceof Error) {
              messageNext += `\t${errorToString(error)}\n\n`
            } else {
              messageNext += `\t${preString}${JSON.stringify(errors)}\n`
            }
          }
        }
      } else if (current instanceof Error) {
        messageNext += `${errorToString(current)}\n`
      } else if (typeof current === 'function') {
        messageNext += `${preString}[Function]`
      } else {
        messageNext += `${preString}${JSON.stringify(current, getCircularReplacer())}`
      }
    } catch (e) {
      messageNext += `${preString}${JSONStringifySafe(current, getCircularReplacer(), 4)}`
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

export async function notDevelopment<T>(callback: () => Promise<T | null>) {
  if (process.env.NODE_ENV === 'development') {
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

export async function timerV2<T>(callback: () => Promise<T>) {
  const start = process.hrtime.bigint()
  const result = await callback()
  const end = process.hrtime.bigint()
  return { result, time: Math.round(Number(end - start) / 1e6) }
}

export function argsCount(...args: any[]) {
  return args.reduce((prev, current) => {
    if (current) {
      prev++
    }

    return prev
  }, 0)
}

export const capitalize = (s: string) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function convertToBoolean(v: any) {
  if (typeof v !== 'boolean') {
    const valueNumber = Number(v)
    if (!Number.isNaN(valueNumber)) {
      return valueNumber === 1
    }

    if (typeof v === 'string') {
      const lowerCase = v.toLowerCase()
      if (['yes', 'no'].includes(lowerCase)) {
        return true
      }

      if (['no', 'n'].includes(lowerCase)) {
        return true
      }
    }

    return false
  }

  return v
}

export function convertNullishToEmpty(v: any) {
  return v === null || v === undefined ? '' : v.trim()
}

export function isStringifiedObject(string: string) {
  let result = false
  const match = string.match(stringifiedObject)
  if (match && match[0]) {
    result = true
  }

  return result
}

export function prepareSQLIn(items: (string | number)[]) {
  let result = null
  if (typeof items[0] === 'number') {
    result = items.join(',')
  }

  if (typeof items[0] === 'string') {
    result = `'${items.join("','")}'`
  }

  return result
}

export function removeEmpty(obj: Record<string, string | number | undefined | null>) {
  return Object.fromEntries(Object.entries(obj).filter(([_, v]) => v !== null && v !== '' && v !== undefined))
}

export const currentDateFunction = () => new Date()

export type ValueOf<T> = T[keyof T]

export function removeSpaces(input: string) {
  if (input) {
    input = input.replace(/\s/g, '')
  }

  return input
}

export function isISODate(value: string) {
  return isoDateRegex.exec(value)
}

export function parseDate(value: any) {
  let result = value
  if (typeof value === 'string' && isISODate(value)) {
    result = new Date(value)
  }

  return result
}

export async function waitFor(condition: () => Promise<boolean>, intervalMs: number = 10000, maxNumberOfAttempts: number = 100): Promise<boolean> {
  return new Promise((resolve, reject) => {
    let currentAttempt = 0

    const checkCondition = async () => {
      logger.debug(`currentAttempt ${currentAttempt}`)
      if (currentAttempt >= maxNumberOfAttempts) {
        reject(new Error('Maximum number of attempts exceeded'))
        return
      }

      let result = false
      try {
        result = await condition()
      } catch (e) {
        reject(e)
        return
      }

      if (result) {
        resolve(true)
      } else {
        currentAttempt++
        setTimeout(checkCondition, intervalMs)
      }
    }

    checkCondition()
  })
}

export const isEmptyObject = (obj: Record<string, any>): boolean => Object.keys(obj).length === 0

export function splitWords(input: string) {
  const regexp = /[\p{L}\p{N}_.-]+/gu
  return input.match(regexp)?.map((i) => i.toLowerCase())
}
