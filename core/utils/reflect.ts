export function getOwnMethodNames(obj: any) {
  const prototypeFields: Set<string> = new Set([
    'constructor',
    '__defineGetter__',
    '__defineSetter__',
    'hasOwnProperty',
    '__lookupGetter__',
    '__lookupSetter__',
    'isPrototypeOf',
    'propertyIsEnumerable',
    'toString',
    'valueOf',
    '__proto__',
    'toLocaleString',
  ])
  const methods = new Set()

  while ((obj = Reflect.getPrototypeOf(obj))) {
    const keys = Reflect.ownKeys(obj)
    for (const key of keys) {
      if (!prototypeFields.has(key.toString())) {
        methods.add(key)
      }
    }
  }

  return methods
}

export function hasOwnMethods(obj: any) {
  for (const key in obj) {
    if (typeof obj[key] === 'function') {
      return true
    }
  }

  return getOwnMethodNames(obj).size > 0
}

export function isNonPrimitive(value: any) {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}
