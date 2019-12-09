import { AbstractEntity } from '../../../core/entity/AbstractEntity'
import * as yup from 'yup'
import { AbstractObject } from '../../../core/AbstractObject'

const scheme = yup.object().shape({
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

type TFile = yup.InferType<typeof scheme>

export class File extends AbstractEntity<TFile> implements TFile {
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

  public static cast(data: AbstractObject): TFile {
    return scheme.noUnknown().cast(data)
  }
}
