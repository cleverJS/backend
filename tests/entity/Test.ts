import { boolean, number, object, string } from 'yup'

import { AbstractEntity } from '../../core/entity/AbstractEntity'
import { capitalize, convertToBoolean } from '../../core/utils/common'

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
    title: string().transform(capitalize).required(),
    active: boolean().transform(convertToBoolean).defined().default(false),
    object: object().defined().default({}),
  })

export const castTest = async (data: unknown): Promise<ITest> => {
  return scheme.noUnknown().validate(data)
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
