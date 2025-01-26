import { DBEntityResource } from '../../../../core/db/sql/DBEntityResource'
import { File, TFile } from '../File'

export class FileEntityResource extends DBEntityResource<File> {
  async mapToDB(item: File) {
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

    const { data, ...dataDB } = await super.mapToDB(item)

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

  async map(data: Record<string, any>): Promise<TFile> {
    const { data: fileData, ...dataDB } = await super.map(data)

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
