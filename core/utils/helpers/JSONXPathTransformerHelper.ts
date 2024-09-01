import { Cache } from '../../cache/Cache'
import { loggerNamespace } from '../../logger/logger'

const parseRegex = /^parse\((.+)\)(\/.+)?$/

export type JSONXpathTransformConfig = {
  [sourcePath: string]: string
}

export class JSONXPathTransformerHelper {
  static #instance: JSONXPathTransformerHelper
  #cache: Cache
  protected readonly logger = loggerNamespace('ConditionDbParser')

  public static instance(cache?: Cache): JSONXPathTransformerHelper {
    if (!JSONXPathTransformerHelper.#instance) {
      if (!cache) {
        throw new Error('Cache should be passed on first instance call')
      }

      JSONXPathTransformerHelper.#instance = new JSONXPathTransformerHelper(cache)
    }

    return JSONXPathTransformerHelper.#instance
  }

  protected constructor(cache: Cache) {
    this.#cache = cache
  }

  /**
   * Transform json object from one structure to another
   *
   * @example
   *     const config: JSONXpathTransformConfig = {
   *       'user/name': 'fullName',
   *       'user/age': 'age',
   *       'user/address/street': 'location/street',
   *       'user/address/city': 'location/city',
   *       'job/title': 'occupation',
   *       'job/company': 'employer',
   *       'stringify(user/address/street,user/address/city,parse(preferences/settings)/country:user/address/country)': 'locationJson',
   *       'parse(preferences/settings)': 'settings',
   *       'parse(preferences/history)': 'visitedPages',
   *     }
   *
   * @param {Record<string, any>} input
   * @param {JSONXpathTransformConfig} config
   */
  async transform(input: Record<string, any>, config: JSONXpathTransformConfig): Promise<Record<string, any>> {
    const output: Record<string, any> = {}
    for (const [source, target] of Object.entries(config)) {
      let value
      if (source.startsWith('stringify(')) {
        value = await this.#stringify(input, source)
      } else if (source.startsWith('parse(')) {
        value = await this.#parse(input, source)
      } else {
        value = this.#getValueByPath(input, source)
      }

      if (value !== undefined) {
        this.#setValueByPath(output, target, value)
      }
    }

    return output
  }

  #stringifyKeysToConfig(keys: string[]) {
    return keys.reduce(
      (acc, item) => {
        const [key, value] = item.split(':')

        let nextValue: string | undefined = value

        if (nextValue === undefined) {
          if (key.startsWith('parse(')) {
            const match = key.match(parseRegex)

            if (!match?.[1]) {
              throw new Error(`keys for parsing were not matched: ${key}`)
            }

            if (match?.[2]) {
              nextValue = match[2].slice(1)
            } else {
              nextValue = match[1].split('/').pop()
            }
          } else {
            nextValue = key
          }
        }

        if (nextValue === undefined) {
          throw new Error('Cannot assemble keys to config')
        }

        acc[key] = nextValue
        return acc
      },
      {} as Record<string, any>
    )
  }

  #getValueByPath(obj: any, path: string): any {
    const keys = path.split('/')
    let result = obj
    for (const key of keys) {
      if (key in result) {
        result = result[key]
      } else {
        return undefined
      }
    }
    return result
  }

  #setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('/')
    let current = obj
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (i === keys.length - 1) {
        current[key] = value
      } else {
        if (!current[key]) {
          current[key] = {}
        }
        current = current[key]
      }
    }
  }

  async #parse(input: any, source: string) {
    const match = source.match(parseRegex)
    if (!match?.[1]) {
      throw new Error(`keys for parsing were not matched: ${source}`)
    }

    const key = match[1]
    let value = this.#getValueByPath(input, key)
    value = await this.#cache.getOrSet(
      `JSONXPath_parse_${key}`,
      () => {
        return JSON.parse(value)
      },
      Cache.TTL_1MIN
    )

    if (match?.[2]) {
      value = this.#getValueByPath(value, match?.[2].slice(1))
    }

    return value
  }

  async #stringify(input: any, source: string): Promise<string> {
    const match = source.match(/stringify\((.*)\)/)

    if (!match?.[1]) {
      throw new Error(`keys for stringify were not matched: ${source}`)
    }

    const keys = match[1].split(',')
    const config = this.#stringifyKeysToConfig(keys)
    let output = await this.transform(input, config)

    if (keys.length === 1 && keys[0].search(':') === -1) {
      for (const target of Object.values(config)) {
        output = output[target]
      }
    }

    return JSON.stringify(output)
  }
}
