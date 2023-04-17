import fs from 'fs'

import { settings } from '../../../../demo/configs'
import { FileService } from '../../../../demo/modules/file/FileService'
import { createFileTable } from '../../../migrations/tables'
import { demoAppContainer } from '../../../setup/DemoAppContainer'

describe('Test FileService', () => {
  const connection = demoAppContainer.connection
  const service = demoAppContainer.serviceContainer.fileService

  const runtimeDir = settings.runtimeDir
  const contentFile =
    'R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8IyPqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCYsapyuvUUlvONmOZtfzgFzByTB10QgxOR0TqBQejhRNzOfkVJ+5YiUqrXF5Y5lKh/DeuNcP5yLWGsEbtLiOSpa/TPg7JpJHxyendzWTBfX0cxOnKPjgBzi4diinWGdkF8kjdfnycQZXZeYGejmJlZeGl9i2icVqaNVailT6F5iJ90m6mvuTS4OK05M0vDk0Q4XUtwvKOzrcd3iq9uisF81M1OIcR7lEewwcLp7tuNNkM3uNna3F2JQFo97Vriy/Xl4/f1cf5VWzXyym7PHhhx4dbgYKAAA7'

  beforeAll(async () => {
    fs.rmSync(`${runtimeDir}/usr`, { recursive: true, force: true })
    await createFileTable(connection)
  })

  beforeEach(async () => {
    await connection.table('file').truncate()
  })

  afterAll(async () => {
    fs.rmSync(`${runtimeDir}/usr`, { recursive: true, force: true })
    await demoAppContainer.destroy()()
  })

  it('should create file from url and delete it', async () => {
    const item = await service.createFileFromPath('https://nodejs.org/static/images/logo.svg')

    if (!item) {
      throw new Error('No item')
    }

    expect(fs.existsSync(item.getFilePath())).toBeTruthy()

    const newFileContentString = fs.readFileSync(item.getFilePath()).toString()

    expect(newFileContentString.length).toBeTruthy()

    if (item.id) {
      await service.delete(item.id)
    }

    expect(fs.existsSync(item.getFilePath())).not.toBeTruthy()
  })

  it('should create file from base64 content and delete it', async () => {
    const content = `data:image/gif;base64,${contentFile}`

    const item = await service.createFileFromContent(content, 'larry.gif', null, 'code1', 110, { some: 'data' })

    expect(item).toBeTruthy()

    if (!item) {
      throw new Error('No item')
    }

    expect(item.code).toEqual('code1')
    expect(item.mime).toEqual('image/gif')
    expect(item.sort).toEqual(110)
    expect(item.data).toEqual({ some: 'data' })

    expect(fs.existsSync(item.getFilePath())).toBeTruthy()
    const newFileContentString = fs.readFileSync(item.getFilePath()).toString()

    expect(newFileContentString).toEqual(contentFile)

    if (item.id) {
      await service.delete(item.id)
    }

    expect(fs.existsSync(item.getFilePath())).not.toBeTrue()
  })

  it('should create file from stream', async () => {
    const item = await service.createFileFromStream(FileService.bufferToStream(Buffer.from(contentFile)), 'larry.gif', 'image/gif', 'code1', 110, {
      some: 'data',
    })

    if (!item) {
      throw new Error('No item')
    }

    expect(item.code).toEqual('code1')
    expect(item.mime).toEqual('image/gif')
    expect(item.sort).toEqual(110)
    expect(item.data).toEqual({ some: 'data' })

    expect(fs.existsSync(item.getFilePath())).toBeTruthy()

    const newFileContentString = fs.readFileSync(item.getFilePath()).toString()

    expect(newFileContentString).toEqual(contentFile)

    if (item.id) {
      await service.delete(item.id)
    }

    expect(fs.existsSync(item.getFilePath())).not.toBeTruthy()
  })
})
