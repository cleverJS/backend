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
  public code: string | null = ''
  public name: string = ''
  public mime: string | null = ''
  public baseDir: string = ''
  public url: string = ''
  public sort: number = 100
  public data: Record<string, any> = {}
  public createdAt: Date | null = null
  public updatedAt: Date | null = null

  public getFilePath(): string {
    return `${this.baseDir}${this.url}`
  }
}
