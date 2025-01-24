export type TEntityFrom<E> = RemoveFunctions<NonFunctionProps<E>>

type NonFunctionProps<T> = {
  [K in keyof T]: T[K] extends (...args: any[]) => any ? never : T[K]
}

// Remove keys that are `never` from the resulting type
type RemoveFunctions<T> = Pick<
  T,
  {
    [K in keyof T]: T[K] extends never ? never : K
  }[keyof T]
>

export type TClass<T = Record<any, any>> = new (...args: any) => T
