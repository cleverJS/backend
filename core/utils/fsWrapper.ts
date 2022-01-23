import fs from 'fs'
import { logger } from '../logger/logger'

export class FSWrapper {
  public static createFileSync(path: string): void {
    fs.writeFileSync(path, '')
  }

  public static removeSync(path: string): boolean {
    let result = true
    try {
      fs.unlinkSync(path)
    } catch {
      result = false
    }

    return result
  }

  public static mkdirpSync(path: string): string | undefined {
    try {
      return fs.mkdirSync(path, { recursive: true })
    } catch {
      // Nothing to do
    }

    return undefined
  }

  public static async remove(path: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.unlink(path, (err) => {
        let result = true
        if (err) {
          result = false
          if (err.code !== 'ENOENT') {
            logger.error(`[FSWrapper.remove] ${JSON.stringify(err)}`)
          }
        }

        resolve(result)
      })
    })
  }

  public static async copyFile(source: string, destination: string): Promise<boolean> {
    return new Promise((resolve) =>
      fs.copyFile(source, destination, (err) => {
        let result = true
        if (err) {
          result = false
          logger.error(err)
        }

        resolve(result)
      })
    )
  }

  public static async mkdirp(path: string): Promise<boolean> {
    return new Promise((resolve) => {
      fs.mkdir(path, { recursive: true }, (err) => {
        let result = true
        if (err) {
          result = false
          logger.error(err)
        }

        resolve(result)
      })
    })
  }
}
