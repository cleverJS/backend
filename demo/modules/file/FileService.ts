import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { v4 as uuidV4 } from 'uuid'
import md5 from 'md5'
import { Duplex } from 'stream'
import { logger } from '../../../core/logger/logger'
import { HttpClient } from '../../../core/http/client/HttpClient'
import { File } from './File'
import { FileResource } from './resource/FileResource'

export class FileService {
  protected httpClient: HttpClient
  protected resource: FileResource
  protected baseDir: string
  protected baseUrl: string = '/usr'
  protected tmpDir: string = ''

  public constructor(baseDir: string, resource: FileResource, httpClient: HttpClient) {
    this.httpClient = httpClient
    this.resource = resource
    this.baseDir = baseDir

    if (!fs.existsSync(baseDir)) {
      fs.mkdirpSync(baseDir)
    }
    this.tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleverjs-files'))
  }

  public async createFileFromContent(
    content: string,
    newFileName: string,
    mime: string | null = null,
    code: string | null = null,
    sort: number = 100,
    data: Record<string, any> = {},
    parseBase64: boolean = true
  ) {
    let item
    const tmpContent = parseBase64 ? this.parseBase64Data(content) : { mime, content: Buffer.from(content) }
    if (tmpContent) {
      item = this.createFileFromStream(FileService.bufferToStream(tmpContent.content), newFileName, tmpContent.mime, code, sort, data)
    }

    return item
  }

  public createFileFromStream(
    stream: Duplex,
    newFileName: string,
    mime: string | null = null,
    code: string | null = null,
    sort: number = 100,
    data: Record<string, any> = {}
  ): Promise<File | null | undefined> {
    const tmpFile = path.normalize(`${this.tmpDir}${path.sep}${uuidV4()}`)
    const writeStream = fs.createWriteStream(tmpFile, { encoding: 'utf-8' })
    stream.pipe(writeStream)
    return new Promise((resolve) => {
      writeStream.on('close', () => {
        stream.destroy()
        const item = this.createFileFromPath(tmpFile, newFileName, mime, code, sort, data)
        resolve(item)
      })
    })
  }

  public async createFileFromPath(
    pathOrUrl: string,
    newFileName: string | null = null,
    mime: string | null = null,
    code: string | null = null,
    sort: number = 100,
    data: Record<string, any> = {}
  ) {
    const realFileName = newFileName || this.getFilenameFromPath(pathOrUrl)
    const fileName = `${Date.now()}_${realFileName}`
    const urlPath = await this.createUrlPath(this.baseDir, code, fileName)
    const url = `${urlPath}${path.sep}${fileName}`
    const destinationPath = `${this.baseDir}${url}`
    await this.copyFileToDestination(pathOrUrl, destinationPath)

    let item
    try {
      item = this.resource.createEntity({
        code,
        mime,
        url,
        sort,
        data,
        name: fileName,
        baseDir: this.baseDir,
      })
      await this.resource.save(item)
    } catch (e) {
      logger.error(e)
    }

    return item || null
  }

  public async delete(id: number) {
    const item = await this.resource.findById(id)
    if (item) {
      await Promise.all([this.deleteFile(item), this.resource.delete(id)])
    }
  }

  public static bufferToStream(buffer: Buffer) {
    const stream = new Duplex()
    stream.push(buffer)
    stream.push(null)

    stream.on('error', (error: Error) => {
      logger.error(error)
    })
    return stream
  }

  protected async deleteFile(item: File) {
    const dir = item.baseDir + item.url
    await fs.remove(dir)
  }

  protected copyFileToDestination(source: string, destination: string) {
    if (source.substr(0, 4).toLocaleLowerCase() === 'http') {
      return this.httpClient.download(source, destination)
    }

    return fs.copyFile(source, destination).catch(logger.error)
  }

  protected async createUrlPath(baseDir: string, code: string | null, fileName: string) {
    const subDir = md5(code + fileName).substr(0, 4)
    const fileUrl = this.baseUrl + path.sep + subDir
    const filePath = baseDir + fileUrl
    await fs.mkdirp(filePath)
    return fileUrl
  }

  protected getFilenameFromPath(pathOrUrl: string) {
    return path.basename(pathOrUrl)
  }

  protected parseBase64Data(data: string) {
    if (data) {
      const regexp = /data:(.+);base64,(.+)/
      const match = data.match(regexp)
      if (match && match[1] && match[2]) {
        return {
          mime: match[1],
          content: Buffer.from(match[2]),
        }
      }
    }

    return null
  }
}
