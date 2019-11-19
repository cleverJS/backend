import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { AbstractObject } from '../../../../core/AbstractObject'
import { File, IFileData } from '../File'

export class FileResourceSql extends AbstractDBResource<File> {
  protected table = 'file'

  protected map(data: AbstractObject): IFileData {
    return {
      id: data.id,
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
