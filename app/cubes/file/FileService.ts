import fs from 'fs-extra'
import path from 'path'
import os from 'os'
import { v4 as uuid } from 'uuid'
import md5 from 'md5'
import { IAbstractDependenciesList } from '../../../core/AbstractService'
import { AbstractResource } from '../../../core/db/AbstractResource'
import { logger } from '../../../core/logger/logger'
import { HttpClient } from '../../../core/http/client/HttpClient'
import { File } from './File'

interface IDependenciesList extends IAbstractDependenciesList<File> {
  resource: AbstractResource<File>
  httpClient: HttpClient
}

export class FileService {
  protected deps: IDependenciesList
  protected baseDir: string
  protected baseUrl: string = '/usr'

  public constructor(baseDir: string, deps: IDependenciesList) {
    this.deps = deps
    this.baseDir = baseDir
  }

  public async createFileFromContent(
    content: string,
    newFileName: string,
    mime: string | null = null,
    code: string | null = null,
    sort: number = 100,
    data: object = {},
    parseBase64: boolean = true
  ) {
    let item
    const tmpContent = parseBase64 ? this.parseBase64Data(content) : { content, mime }
    if (tmpContent) {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'file-'))
      try {
        const tmpFile = path.normalize(`${tmpDir}${path.sep}${uuid()}`)
        await fs.writeFile(tmpFile, tmpContent.content, { encoding: 'utf-8' })
        item = await this.createFileFromPath(tmpFile, newFileName, tmpContent.mime, code, sort, data)
      } catch (e) {
        logger.error(e)
      }
    }

    return item
  }

  public async createFileFromPath(
    pathOrUrl: string,
    newFileName: string | null = null,
    mime: string | null = null,
    code: string | null = null,
    sort: number = 100,
    data: object = {}
  ) {
    const fileName = `${Date.now()}_${newFileName || this.getFilenameFromPath(pathOrUrl)}`
    const urlPath = await this.createUrlPath(this.baseDir, code, fileName)
    const url = urlPath + path.sep + fileName
    await this.copyFileToDestination(pathOrUrl, this.baseDir + url)

    let item
    try {
      item = this.deps.resource.createEntity({
        code,
        mime,
        url,
        sort,
        data,
        name: fileName,
        baseDir: this.baseDir,
      })
      await this.deps.resource.save(item)
    } catch (e) {
      logger.error(e)
    }

    return item || null
  }

  public async delete(id: string) {
    const item = await this.deps.resource.findById(id)
    if (item) {
      await Promise.all([this.deleteFile(item), this.deps.resource.delete(id)])
    }
  }

  protected async deleteFile(item: File) {
    const dir = item.baseDir + item.url
    await fs.remove(dir)
  }

  protected async copyFileToDestination(source: string, destination: string) {
    if (source.substr(0, 4).toLocaleLowerCase() === 'http') {
      await this.deps.httpClient.download(source, destination).catch(logger.error)
    } else {
      await fs.copyFile(source, destination).catch(logger.error)
    }
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
          content: Buffer.from(match[2], 'base64'),
        }
      }
    }

    return null
  }
}
