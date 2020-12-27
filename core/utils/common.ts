export const CORE_DEBUG = (process.env.CORE_DEBUG || 'false') === ' true'

export const isInstanceOf = <T>(object: any, uniqueInstanceProperty: string): object is T => {
  return uniqueInstanceProperty in object
}
