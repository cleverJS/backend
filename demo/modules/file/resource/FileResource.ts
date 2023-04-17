import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { File, TFile } from '../File'

export class FileResource extends AbstractDBResource<File> {
  protected table = 'file'

  mapToDB(item: File): any {
    if (!item.createdAt) {
      const currentDate = new Date()
      currentDate.setMilliseconds(0)
      item.createdAt = currentDate
    }

    if (!item.updatedAt) {
      const currentDate = new Date()
      currentDate.setMilliseconds(0)
      item.updatedAt = currentDate
    }

    const { data, ...dataDB } = super.mapToDB(item)

    if (dataDB.updatedAt) {
      dataDB.updatedAt = dataDB.updatedAt.toISOString()
    }

    if (dataDB.createdAt) {
      dataDB.createdAt = dataDB.createdAt.toISOString()
    }

    return {
      ...dataDB,
      data: JSON.stringify(data),
    }
  }

  map(data: Record<string, any>): TFile {
    const { data: fileData, ...dataDB } = super.map(data)

    if (dataDB.updatedAt) {
      dataDB.updatedAt = new Date(data.updatedAt)
    }

    if (dataDB.createdAt) {
      dataDB.createdAt = new Date(data.createdAt)
    }

    return {
      ...dataDB,
      data: JSON.parse(fileData),
    }
  }
}
