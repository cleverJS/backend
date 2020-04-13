import { AbstractDBResource } from '../../../../core/db/sql/AbstractDBResource'
import { File } from '../File'

export class FileResourceSql extends AbstractDBResource<File> {
  protected table = 'file'

  public static scheme = {
    id: 'id',
    code: 'code',
    name: 'name',
    mime: 'mime',
    baseDir: 'baseDir',
    url: 'url',
    sort: 'sort',
    data: 'data',
    createdAt: 'createdAt',
    updatedAt: 'updatedAt',
  }

  public map(data: Record<string, any>): typeof FileResourceSql.scheme {
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
