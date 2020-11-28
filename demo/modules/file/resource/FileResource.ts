import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { File, TFile } from '../File'

export class FileResource extends AbstractDBResource<File> {
  protected table = 'file'

  mapToDB(item: File): any {
    const { data, ...dataDB } = super.mapToDB(item)
    return {
      ...dataDB,
      data: JSON.stringify(data),
    }
  }

  map(data: Record<string, any>): TFile {
    const { data: fileData, ...dataDB } = super.map(data)
    return {
      ...dataDB,
      data: JSON.parse(fileData),
    }
  }
}
