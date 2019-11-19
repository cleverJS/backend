import { AbstractMongoResource } from '../../../../core/db/mongo/AbstractMongoResource'
import { AbstractObject } from '../../../../core/AbstractObject'
import { File, IFileData } from '../File'

export class FileResourceMongo extends AbstractMongoResource<File> {
  protected collectionName = 'file'

  protected map(data: AbstractObject): IFileData {
    const id = data._id.toHexString()
    return {
      id,
      code: data.code,
      name: data.name,
      mime: data.mime,
      baseDir: data.baseDir,
      url: data.url,
      sort: data.sort,
      data: data.data,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    }
  }
}
