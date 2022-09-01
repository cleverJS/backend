import { boolean, number, object, string } from 'yup'

import { AbstractEntity } from '../../core/entity/AbstractEntity'

export interface ITest extends Object {
  id: number
  title: string
  active: boolean
  object: Record<string, any>
}

const scheme = object()
  .defined()
  .shape({
    id: number().defined().default(0),
    title: string().defined().default(''),
    active: boolean().transform(convertToBoolean).defined().default(false),
    object: object().defined().default({}),
  })

function convertToBoolean(v: any) {
  if (typeof v !== 'boolean') {
    return v === 1
  }

  return v
}

export const castTest = (data: unknown): ITest => {
  return scheme.noUnknown().cast(data)
}

export class Test extends AbstractEntity<ITest> implements ITest {
  public id = 0
  public title = ''
  public active = false
  public object = {}

  #modified: boolean = false

  public setIsModified(value: boolean): void {
    this.#modified = value
  }

  public isModified(): boolean {
    return this.#modified
  }
}
