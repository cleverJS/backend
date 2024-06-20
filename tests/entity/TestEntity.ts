import { Buffer } from 'buffer'
import { boolean, number, object, string } from 'yup'

import { AbstractEntity } from '../../core/entity/AbstractEntity'
import { capitalize, convertNullishToEmpty, convertToBoolean } from '../../core/utils/common'

export interface ITestEntity extends Record<string, any> {
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
    body: string().transform(convertNullishToEmpty).default(''),
    active: boolean().transform(convertToBoolean).defined().default(false),
    object: object().defined().default({}),
  })

export const castTestEntity = async (data: unknown): Promise<ITestEntity> => {
  return scheme.noUnknown().validate(data)
}

export class TestEntity extends AbstractEntity<ITestEntity> implements ITestEntity {
  public id: number = 0
  public title: string = ''
  public body: string = ''
  public active: boolean = false
  public date: Date = new Date('2022-11-30T11:37:25.708Z')
  public object = {}
  public buffer = Buffer.from('ABC')

  #modified: boolean = false

  public setIsModified(value: boolean): void {
    this.#modified = value
  }

  public isModified(): boolean {
    return this.#modified
  }
}
