import { FileService } from './FileService'
import { settings } from '../../configs'
import fs from 'fs-extra'
import { AbstractResource } from '../../../core/db/AbstractResource'
import { Condition } from '../../../core/db/Condition'
import { logger } from '../../../core/logger/logger'
import { HttpClient } from '../../../core/http/client/HttpClient'
import { File } from './File'
import { EntityFactory } from '../../../core/entity/EntityFactory'
import { AbstractObject } from '../../../core/AbstractObject'

// jest.mock('./repository/FileResourceMongo')
class FileResourceStub extends AbstractResource<File> {
  public constructor(entityFactory: EntityFactory<File>) {
    super(entityFactory)
  }

  public findAll(condition: Condition) {
    logger.info(condition)
    return Promise.resolve([])
  }

  public findOne(condition: Condition) {
    logger.info(condition)
    return Promise.resolve(null)
  }

  public findById(id: string) {
    logger.info(id)
    return Promise.resolve(null)
  }

  public count(condition?: Condition) {
    logger.info(condition)
    return Promise.resolve(0)
  }

  public save(item: any) {
    logger.info(item)
    return Promise.resolve(false)
  }

  public delete(id: string) {
    logger.info(id)
    return Promise.resolve(false)
  }

  public deleteAll(condition: Condition) {
    logger.info(condition)
    return Promise.resolve(false)
  }

  public map(data: any) {
    return data
  }

  public createEntity(data: AbstractObject): File {
    return this.entityFactory.create(data)
  }
}

describe('Test FileService', () => {
  let fileResource: AbstractResource<File>

  beforeAll(() => {
    fileResource = new FileResourceStub(new EntityFactory(File, File.cast))
  })

  afterAll(() => {
    fs.removeSync(settings.runtimeTestDir)
  })

  it('should create file from url and delete it', async () => {
    const service = new FileService(settings.runtimeTestDir, {
      resource: fileResource,
      httpClient: new HttpClient(),
    })

    const item = await service.createFileFromPath('https://bsstc.com.au/assets/play-posters/The-Lighthouse-Girl-high-res.jpg')

    expect(item).not.toBeUndefined()
    if (item) {
      expect(item.id).not.toBeNull()
      expect(fs.existsSync(item.getFilePath())).toBeTruthy()

      fileResource.findById = jest.fn(() => {
        return Promise.resolve(item)
      })

      await service.delete(String(item.id))

      expect(fs.existsSync(item.getFilePath())).not.toBeTruthy()
    }
  })

  it('should create file from base64 content and delete it', async () => {
    // tslint:disable-next-line:max-line-length
    const content = `data:image/gif;base64,R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8IyPqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCYsapyuvUUlvONmOZtfzgFzByTB10QgxOR0TqBQejhRNzOfkVJ+5YiUqrXF5Y5lKh/DeuNcP5yLWGsEbtLiOSpa/TPg7JpJHxyendzWTBfX0cxOnKPjgBzi4diinWGdkF8kjdfnycQZXZeYGejmJlZeGl9i2icVqaNVailT6F5iJ90m6mvuTS4OK05M0vDk0Q4XUtwvKOzrcd3iq9uisF81M1OIcR7lEewwcLp7tuNNkM3uNna3F2JQFo97Vriy/Xl4/f1cf5VWzXyym7PHhhx4dbgYKAAA7`

    const service = new FileService(settings.runtimeTestDir, {
      resource: fileResource,
      httpClient: new HttpClient(),
    })

    const item = await service.createFileFromContent(content, 'larry.gif', null, 'code1', 110, { some: 'data' })

    expect(item).not.toBeUndefined()
    if (item) {
      expect(item.id).not.toBeNull()
      expect(item.code).toEqual('code1')
      expect(item.mime).toEqual('image/gif')
      expect(item.sort).toEqual(110)
      expect(item.data).toEqual({ some: 'data' })

      expect(fs.existsSync(item.getFilePath())).toBeTruthy()

      fileResource.findById = jest.fn(() => {
        return Promise.resolve(item)
      })

      await service.delete(String(item.id))

      expect(fs.existsSync(item.getFilePath())).not.toBeTruthy()
    }
  })
})
