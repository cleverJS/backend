export type TEntityFrom<E> = {
  [Property in keyof E]: E[Property]
}
