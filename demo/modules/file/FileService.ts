import * as fs from 'fs'
import http, { IncomingMessage } from 'http'
import https from 'https'
import md5 from 'md5'
import os from 'os'
import path from 'path'
import { Duplex, pipeline } from 'stream'
import { v4 as uuidV4 } from 'uuid'

import { logger, loggerNamespace } from '../../../core/logger/logger'
import { FSWrapper } from '../../../core/utils/fsWrapper'

import { File } from './File'
import { FileEntityResource } from './resource/FileEntityResource'

export class FileService {
  protected readonly logger = loggerNamespace('FileService')
  protected resource: FileEntityResource
  protected baseDir: string
  protected baseUrl: string = '/usr'
  protected tmpDir: string = ''

  public constructor(baseDir: string, resource: FileEntityResource) {
    this.resource = resource
    this.baseDir = baseDir

    if (!fs.existsSync(baseDir)) {
      FSWrapper.mkdirpSync(baseDir)
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
  ): Promise<File | null> {
    let item = null
    const tmpContent = parseBase64 ? this.parseBase64Data(content) : { mime, content: Buffer.from(content) }
    if (tmpContent) {
      item = this.createFileFromStream(FileService.bufferToStream(tmpContent.content), newFileName, tmpContent.mime, code, sort, data)
    }

    return item
  }

  public async createFileFromStream(
    stream: Duplex,
    newFileName: string,
    mime: string | null = null,
    code: string | null = null,
    sort: number = 100,
    data: Record<string, any> = {}
  ): Promise<File | null> {
    const tmpFile = path.normalize(`${this.tmpDir}${path.sep}${uuidV4()}`)
    const writeStream = fs.createWriteStream(tmpFile, { encoding: 'utf-8' })
    pipeline(stream, writeStream, (err) => {
      if (err) {
        this.logger.error(err)
      }
    })

    return new Promise((resolve) => {
      writeStream.on('close', async () => {
        const item = await this.createFileFromPath(tmpFile, newFileName, mime, code, sort, data)
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
  ): Promise<File | null> {
    const realFileName = newFileName || this.getFilenameFromPath(pathOrUrl)
    const fileName = `${Date.now()}_${realFileName}`
    const urlPath = await this.createUrlPath(this.baseDir, code, fileName)
    const url = `${urlPath}${path.sep}${fileName}`
    const destinationPath = `${this.baseDir}${url}`
    await this.copyFileToDestination(pathOrUrl, destinationPath)

    let item: File | null = null
    try {
      item = await this.resource.createEntity({
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
      this.logger.error(e)
    }

    return item || null
  }

  public async delete(id: number): Promise<void> {
    const item = await this.resource.findById(id)
    if (item) {
      await Promise.all([this.deleteFile(item), this.resource.delete(id, 'requestor')])
    }
  }

  public static bufferToStream(buffer: Buffer): Duplex {
    const stream = new Duplex()
    stream.push(buffer)
    stream.push(null)

    stream.on('error', (error: Error) => {
      logger.error(error)
    })

    return stream
  }

  protected async deleteFile(item: File): Promise<void> {
    const dir = item.baseDir + item.url
    await FSWrapper.remove(dir)
  }

  protected async copyFileToDestination(source: string, destination: string) {
    if (source.substr(0, 4).toLocaleLowerCase() === 'http') {
      return this.urlDownload(source, destination)
    }

    return FSWrapper.copyFile(source, destination)
  }

  protected async createUrlPath(baseDir: string, code: string | null, fileName: string): Promise<string> {
    const subDir = md5(code + fileName).substr(0, 4)
    const fileUrl = this.baseUrl + path.sep + subDir
    const filePath = baseDir + fileUrl
    await FSWrapper.mkdirp(filePath)
    return fileUrl
  }

  protected getFilenameFromPath(pathOrUrl: string): string {
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

  protected async urlDownload(url: string, destination: string) {
    const writer = fs.createWriteStream(destination, { encoding: 'utf-8' })

    let response: IncomingMessage
    if (url.substr(0, 5) === 'https') {
      response = await this.httpsGet(url)
    } else {
      response = await this.httpGet(url)
    }

    pipeline(response, writer, (err) => {
      if (err) {
        this.logger.error(err)
      }
    })

    return new Promise((resolve, reject) => {
      writer.on('finish', () => resolve(true))
      writer.on('error', reject)
    })
  }

  protected async httpGet(url: string): Promise<IncomingMessage> {
    return new Promise((resolve, reject) => {
      http.get(url, (res) => {
        resolve(res)
      })
    })
  }

  protected async httpsGet(url: string): Promise<IncomingMessage> {
    return new Promise((resolve, reject) =>
      https.get(url, (res) => {
        resolve(res)
      })
    )
  }
}
