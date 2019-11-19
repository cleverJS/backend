import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import * as yup from 'yup'
import { AbstractObject } from '../../../core/AbstractObject'

export interface IFileData {
  code: string | null
  name: string
  mime: string | null
  baseDir: string
  url: string
  sort: number
  data: object
  createdAt: string
  updatedAt: string
}

export class File extends AbstractEntity<IFileData> implements IFileData {
  public code = ''
  public name = ''
  public mime = ''
  public baseDir = ''
  public url = ''
  public sort = 100
  public data = {}
  public createdAt = ''
  public updatedAt = ''

  public getFilePath() {
    return `${this.baseDir}${this.url}`
  }

  public static cast(data: AbstractObject): IFileData {
    return yup
      .object()
      .shape({
        id: yup.string(),
        code: yup.string().nullable(),
        name: yup.string(),
        mime: yup.string().nullable(),
        baseDir: yup.string(),
        url: yup.string(),
        sort: yup.number().default(100),
        data: yup.object(),
        createdAt: yup.string(),
        updatedAt: yup.string(),
      })
      .noUnknown()
      .cast(data)
  }
}
