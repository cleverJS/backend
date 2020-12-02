import Knex from 'knex'
import fs from 'fs-extra'
import * as connections from '../../../../knexfile'
import { FileResource } from '../../../../demo/modules/file/resource/FileResource'
import { ConditionDbParser } from '../../../../core/db/sql/condition/ConditionDbParser'
import { EntityFactory } from '../../../../core/entity/EntityFactory'
import { File } from '../../../../demo/modules/file/File'
import { castFile } from '../../../../demo/modules/file/helper'
import { FileService } from '../../../../demo/modules/file/FileService'
import { HttpClient } from '../../../../core/http/client/HttpClient'
import { settings } from '../../../../demo/configs'

describe('Test FileService', () => {
  const contentFile =
    'R0lGODdhMAAwAPAAAAAAAP///ywAAAAAMAAwAAAC8IyPqcvt3wCcDkiLc7C0qwyGHhSWpjQu5yqmCYsapyuvUUlvONmOZtfzgFzByTB10QgxOR0TqBQejhRNzOfkVJ+5YiUqrXF5Y5lKh/DeuNcP5yLWGsEbtLiOSpa/TPg7JpJHxyendzWTBfX0cxOnKPjgBzi4diinWGdkF8kjdfnycQZXZeYGejmJlZeGl9i2icVqaNVailT6F5iJ90m6mvuTS4OK05M0vDk0Q4XUtwvKOzrcd3iq9uisF81M1OIcR7lEewwcLp7tuNNkM3uNna3F2JQFo97Vriy/Xl4/f1cf5VWzXyym7PHhhx4dbgYKAAA7'

  const knexConfig = (connections as any)[process.env.NODE_ENV || 'development'] as Knex.Config
  const connectionRecord = knexConfig.connection as Knex.Sqlite3ConnectionConfig

  const connection = Knex(knexConfig)
  const resource = new FileResource(connection, new ConditionDbParser(), new EntityFactory(File, castFile))
  const service = new FileService(settings.runtimeDir, resource, new HttpClient())

  beforeAll(async () => {
    fs.removeSync(`${settings.runtimeDir}/usr`)
    fs.removeSync(connectionRecord.filename)
    fs.createFileSync(connectionRecord.filename)
    await connection.schema.createTable('file', (t) => {
      t.increments('id').unsigned().primary()
      t.string('code', 255)
      t.string('name', 255)
      t.string('mime', 255)
      t.string('baseDir', 255)
      t.string('sort')
      t.jsonb('data')
      t.integer('url', 255)
      t.dateTime('createdAt')
      t.dateTime('updatedAt')
    })
  })

  beforeEach(async () => {
    await connection.table('file').truncate()
  })

  afterAll(() => {
    fs.removeSync(`${settings.runtimeDir}/usr`)
    fs.removeSync(connectionRecord.filename)
  })

  it('should create file from url and delete it', async () => {
    const item = await service.createFileFromPath('https://nodejs.org/static/images/logo.svg')

    if (!item) {
      throw new Error('No item')
    }

    expect(fs.existsSync(item.getFilePath())).toBeTruthy()

    expect(fs.existsSync(item.getFilePath())).toBeTruthy()
    const newFileContentString = fs.readFileSync(item.getFilePath()).toString()

    expect(newFileContentString).toEqual(
      '<svg xmlns="http://www.w3.org/2000/svg" width="589.827" height="361.238" viewBox="0 0 442.37 270.929"><defs><linearGradient id="b" x1="-.348" x2="1.251" gradientTransform="rotate(116.114 53.1 202.97) scale(86.48)" gradientUnits="userSpaceOnUse"><stop offset=".3" stop-color="#3e863d"/><stop offset=".5" stop-color="#55934f"/><stop offset=".8" stop-color="#5aad45"/></linearGradient><linearGradient id="d" x1="-.456" x2=".582" gradientTransform="rotate(-36.46 550.846 -214.337) scale(132.798)" gradientUnits="userSpaceOnUse"><stop offset=".57" stop-color="#3e863d"/><stop offset=".72" stop-color="#619857"/><stop offset="1" stop-color="#76ac64"/></linearGradient><linearGradient id="f" x1=".043" x2=".984" gradientTransform="translate(192.862 279.652) scale(97.417)" gradientUnits="userSpaceOnUse"><stop offset=".16" stop-color="#6bbf47"/><stop offset=".38" stop-color="#79b461"/><stop offset=".47" stop-color="#75ac64"/><stop offset=".7" stop-color="#659e5a"/><stop offset=".9" stop-color="#3e863d"/></linearGradient><clipPath id="a"><path d="M239.03 226.605l-42.13 24.317a5.085 5.085 0 00-2.546 4.406v48.668c0 1.817.968 3.496 2.546 4.406l42.133 24.336a5.1 5.1 0 005.09 0l42.126-24.336a5.096 5.096 0 002.54-4.406v-48.668c0-1.816-.97-3.496-2.55-4.406l-42.12-24.317a5.123 5.123 0 00-5.1 0"/></clipPath><clipPath id="c"><path d="M195.398 307.086c.403.523.907.976 1.5 1.316l36.14 20.875 6.02 3.46c.9.52 1.926.74 2.934.665.336-.027.672-.09 1-.183l44.434-81.36c-.34-.37-.738-.68-1.184-.94l-27.586-15.93-14.582-8.39a5.318 5.318 0 00-1.32-.53zm0 0"/></clipPath><clipPath id="e"><path d="M241.066 225.953a5.14 5.14 0 00-2.035.652l-42.01 24.247 45.3 82.51c.63-.09 1.25-.3 1.81-.624l42.13-24.336a5.105 5.105 0 002.46-3.476l-46.18-78.89a5.29 5.29 0 00-1.03-.102c-.14 0-.28.007-.42.02"/></clipPath></defs><path fill="#689f63" d="M218.647 270.93c-1.46 0-2.91-.383-4.19-1.12l-13.337-7.896c-1.992-1.114-1.02-1.508-.363-1.735 2.656-.93 3.195-1.14 6.03-2.75.298-.17.688-.11.993.07l10.246 6.08c.37.2.895.2 1.238 0l39.95-23.06c.37-.21.61-.64.61-1.08v-46.1c0-.46-.24-.87-.618-1.1l-39.934-23.04c-.37-.22-.86-.22-1.23 0l-39.926 23.04c-.387.22-.633.65-.633 1.09v46.1c0 .44.24.86.62 1.07l10.94 6.32c5.94 2.97 9.57-.53 9.57-4.05v-45.5c0-.65.51-1.15 1.16-1.15h5.06c.63 0 1.15.5 1.15 1.15v45.52c0 7.92-4.32 12.47-11.83 12.47-2.31 0-4.13 0-9.21-2.5l-10.48-6.04a8.447 8.447 0 01-4.19-7.29v-46.1c0-3 1.6-5.8 4.19-7.28l39.99-23.07c2.53-1.43 5.89-1.43 8.4 0l39.94 23.08a8.428 8.428 0 014.19 7.28v46.1c0 2.99-1.61 5.78-4.19 7.28l-39.94 23.07a8.397 8.397 0 01-4.21 1.12"/><path fill="#689f63" d="M230.987 239.164c-17.48 0-21.145-8.024-21.145-14.754 0-.64.516-1.15 1.157-1.15h5.16c.57 0 1.05.415 1.14.978.78 5.258 3.1 7.91 13.67 7.91 8.42 0 12-1.902 12-6.367 0-2.57-1.02-4.48-14.1-5.76-10.94-1.08-17.7-3.49-17.7-12.24 0-8.06 6.8-12.86 18.19-12.86 12.79 0 19.13 4.44 19.93 13.98a1.164 1.164 0 01-1.16 1.26h-5.19c-.54 0-1.01-.38-1.12-.9-1.25-5.53-4.27-7.3-12.48-7.3-9.19 0-10.26 3.2-10.26 5.6 0 2.91 1.26 3.76 13.66 5.4 12.28 1.63 18.11 3.93 18.11 12.56 0 8.7-7.26 13.69-19.92 13.69m48.66-48.89h1.34c1.1 0 1.31-.77 1.31-1.22 0-1.18-.81-1.18-1.26-1.18h-1.38zm-1.63-3.78h2.97c1.02 0 3.02 0 3.02 2.28 0 1.59-1.02 1.92-1.63 2.12 1.19.08 1.27.86 1.43 1.96.08.69.21 1.88.45 2.28h-1.83c-.05-.4-.33-2.6-.33-2.72-.12-.49-.29-.73-.9-.73h-1.51v3.46h-1.67zm-3.57 4.3c0 3.58 2.89 6.48 6.44 6.48 3.58 0 6.47-2.96 6.47-6.48 0-3.59-2.93-6.44-6.48-6.44-3.5 0-6.44 2.81-6.44 6.43m14.16.03c0 4.24-3.47 7.7-7.7 7.7-4.2 0-7.7-3.42-7.7-7.7 0-4.36 3.58-7.7 7.7-7.7 4.15 0 7.69 3.35 7.69 7.7"/><path fill="#fff" fill-rule="evenodd" d="M94.936 90.55c0-1.84-.97-3.53-2.558-4.445l-42.356-24.37a4.946 4.946 0 00-2.328-.67h-.438c-.812.03-1.613.25-2.34.67L2.562 86.105A5.154 5.154 0 000 90.555l.093 65.64c0 .91.47 1.76 1.27 2.21.78.48 1.76.48 2.54 0l25.18-14.42c1.59-.946 2.56-2.618 2.56-4.44V108.88a5.1 5.1 0 012.555-4.43l10.72-6.174a5.086 5.086 0 012.56-.688c.876 0 1.77.226 2.544.687l10.715 6.172c1.586.91 2.56 2.6 2.56 4.43v30.663c0 1.82.983 3.5 2.565 4.44l25.164 14.41a2.5 2.5 0 002.56 0 2.568 2.568 0 001.268-2.21zm199.868 34.176c0 .457-.243.88-.64 1.106l-14.548 8.386a1.282 1.282 0 01-1.277 0l-14.55-8.386c-.4-.227-.64-.65-.64-1.106V107.93c0-.458.24-.88.63-1.11l14.54-8.4c.4-.23.89-.23 1.29 0l14.55 8.4c.4.23.64.652.64 1.11zM298.734.324a2.568 2.568 0 00-2.544.027c-.78.46-1.262 1.3-1.262 2.21v65a1.788 1.788 0 01-2.684 1.55L281.634 63a5.108 5.108 0 00-5.112 0l-42.37 24.453a5.105 5.105 0 00-2.56 4.42v48.92c0 1.83.977 3.51 2.56 4.43l42.37 24.47c1.582.91 3.53.91 5.117 0l42.37-24.48c1.58-.92 2.56-2.6 2.56-4.43V18.863a5.128 5.128 0 00-2.63-4.47zm141.093 107.164a5.116 5.116 0 002.543-4.422V91.21c0-1.824-.97-3.507-2.547-4.425l-42.1-24.44a5.113 5.113 0 00-5.13 0l-42.36 24.45c-1.59.92-2.56 2.6-2.56 4.43v48.9c0 1.84.99 3.54 2.58 4.45l42.09 23.99c1.55.89 3.45.9 5.02.03l25.46-14.15c.8-.45 1.31-1.3 1.31-2.22 0-.92-.49-1.78-1.29-2.23l-42.62-24.46c-.8-.45-1.29-1.3-1.29-2.21v-15.34c0-.916.48-1.76 1.28-2.216l13.26-7.65c.79-.46 1.76-.46 2.55 0l13.27 7.65c.79.45 1.28 1.3 1.28 2.21v12.06c0 .91.49 1.76 1.28 2.22.79.45 1.77.45 2.56-.01zm0 0"/><path fill="#689f63" fill-rule="evenodd" d="M394.538 105.2a.97.97 0 01.98 0l8.13 4.69c.304.176.49.5.49.85v9.39c0 .35-.186.674-.49.85l-8.13 4.69a.97.97 0 01-.98 0l-8.125-4.69a.979.979 0 01-.5-.85v-9.39c0-.35.18-.674.49-.85zm0 0"/><g clip-path="url(#a)" transform="translate(-78.306 -164.016)"><path fill="url(#b)" d="M331.363 246.793l-118.715-58.19-60.87 124.174L270.49 370.97zm0 0"/></g><g clip-path="url(#c)" transform="translate(-78.306 -164.016)"><path fill="url(#d)" d="M144.07 264.004l83.825 113.453 110.86-81.906-83.83-113.45zm0 0"/></g><g clip-path="url(#e)" transform="translate(-78.306 -164.016)"><path fill="url(#f)" d="M197.02 225.934v107.43h91.683v-107.43zm0 0"/></g></svg>'
    )

    await service.delete(item.id)
    expect(fs.existsSync(item.getFilePath())).not.toBeTruthy()
  })

  it('should create file from base64 content and delete it', async () => {
    const content = `data:image/gif;base64,${contentFile}`

    const item = await service.createFileFromContent(content, 'larry.gif', null, 'code1', 110, { some: 'data' })

    expect(item).not.toBeUndefined()

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

    await service.delete(item.id)

    expect(fs.existsSync(item.getFilePath())).not.toBeTruthy()
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

    await service.delete(item.id)

    expect(fs.existsSync(item.getFilePath())).not.toBeTruthy()
  })
})
