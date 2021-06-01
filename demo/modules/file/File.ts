import { AbstractEntity } from '../../../core/entity/AbstractEntity'

export type TFile = {
  id: number | null
  code: string | null
  name: string
  mime: string | null
  baseDir: string
  url: string
  sort: number
  data: Record<string, any>
  createdAt: Date | null
  updatedAt: Date | null
}

export class File extends AbstractEntity<TFile> implements TFile {
  public id: number | null = null
  public code = ''
  public name = ''
  public mime = ''
  public baseDir = ''
  public url = ''
  public sort = 100
  public data = {}
  public createdAt = null
  public updatedAt = null

  public getFilePath(): string {
    return `${this.baseDir}${this.url}`
  }
}
