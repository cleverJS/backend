export type TEntityFrom<E> = {
  [Property in keyof E]: E[Property]
}

export type TClass<T> = new (...args: any) => T
