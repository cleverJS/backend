import * as yup from 'yup'
import { AbstractEntity } from '../../../core/entity/AbstractEntity'

const scheme = yup
  .object()
  .required()
  .shape({
    id: yup.number(),
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
  public id = 0
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

  public getId(): number {
    return this.id
  }

  public setId(id: number): void {
    this.id = id
  }

  public static cast(data: Record<string, any>): TFile {
    return scheme.noUnknown().cast(data)
  }
}
