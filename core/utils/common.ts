export const isInstanceOf = <T>(object: any, uniqueInstanceProperty: string): object is T => {
  return uniqueInstanceProperty in object
}
