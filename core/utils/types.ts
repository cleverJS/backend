export type TEntityFrom<E> = {
  [Property in keyof E]: E[Property]
}

export type TClass<T = Record<any, any>> = new (...args: any) => T
