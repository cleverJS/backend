import { types } from 'util'
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, Canceler, CancelToken, Method } from 'axios'
import fs from 'fs'
import { RequestCancel } from './RequestCancel'
import { logger } from '../../logger/logger'

axios.defaults.withCredentials = true

export class HttpClient {
  protected readonly client: AxiosInstance
  protected readonly extendedConfig?: AxiosRequestConfig
  protected headers: Record<string, any> = {}

  public constructor(extendedConfig?: AxiosRequestConfig) {
    this.extendedConfig = extendedConfig
    this.client = axios.create()
    this.setHeaders({
      'Content-Type': 'application/json; charset=UTF-8',
    })
  }

  public get(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do('GET', url, payload, cancelObject)
  }

  public post(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do('POST', url, payload, cancelObject)
  }

  public put(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do('PUT', url, payload, cancelObject)
  }

  public patch(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do('PATCH', url, payload, cancelObject)
  }

  public delete(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do('DELETE', url, payload, cancelObject)
  }

  public async download(url: string, destination: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    const config: AxiosRequestConfig = {
      url,
      method: 'GET',
      responseType: 'stream',
      headers: this.headers,
      params: payload,
      cancelToken: this.cancelToken(cancelObject),
    }

    const writer = fs.createWriteStream(destination)
    const response = await this.client({ ...config, ...this.extendedConfig })
    response.data.pipe(writer)

    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }

  public setHeaders(headers: Record<string, any>) {
    this.headers = headers
  }

  protected async do(method: Method, url: string, payload: Record<string, any>, cancelObject?: RequestCancel): Promise<Record<string, any>> {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: this.headers,
      params: {},
      data: {},
      cancelToken: this.cancelToken(cancelObject),
    }

    if (method === 'GET') {
      config.params = payload
    } else {
      config.data = payload
    }

    try {
      const { data } = await this.client({ ...config, ...this.extendedConfig })
      return data || {}
    } catch (error: any) {
      const isAxiosError = (candidate: any): candidate is AxiosError => {
        return candidate.isAxiosError === true
      }

      if (isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          logger.error(error.response.headers)
          logger.error(error.response.status)
          logger.error(error.response.data)
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          logger.error(error.request)
        } else {
          // Something happened in setting up the request that triggered an Error
          logger.error('Error', error.message)
        }
      } else if (types.isNativeError(error)) {
        logger.error(error.message || error)
      }

      throw error
    }
  }

  protected cancelToken(cancelObject?: RequestCancel): CancelToken {
    return new axios.CancelToken((c: Canceler) => {
      if (cancelObject) {
        cancelObject.setCancelFunction(c)
      }
    })
  }
}
