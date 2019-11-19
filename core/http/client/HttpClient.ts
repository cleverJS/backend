import axios, { AxiosInstance, AxiosRequestConfig, Method } from 'axios'
import { RequestCancel } from './RequestCancel'
import { AbstractObject } from '../../AbstractObject'
import { logger } from '../../logger/logger'
import * as fs from 'fs-extra'

axios.defaults.withCredentials = true

export class HttpClient {
  private readonly client: AxiosInstance
  private readonly extendedConfig?: AxiosRequestConfig
  private headers: AbstractObject = {}

  public constructor(extendedConfig?: AxiosRequestConfig) {
    this.extendedConfig = extendedConfig
    this.client = axios.create()
    this.setHeaders({
      'Content-Type': 'application/json; charset=UTF-8',
    })
  }

  public async get(url: string, payload: Object = {}, cancelObject?: RequestCancel) {
    return this.do('GET', url, payload, cancelObject)
  }

  public async post(url: string, payload: Object = {}, cancelObject?: RequestCancel) {
    return this.do('POST', url, payload, cancelObject)
  }

  public async put(url: string, payload: Object = {}, cancelObject?: RequestCancel) {
    return this.do('PUT', url, payload, cancelObject)
  }

  public async patch(url: string, payload: Object = {}, cancelObject?: RequestCancel) {
    return this.do('PATCH', url, payload, cancelObject)
  }

  public async delete(url: string, payload: Object = {}, cancelObject?: RequestCancel) {
    return this.do('DELETE', url, payload, cancelObject)
  }

  public async download(url: string, destination: string, payload: AbstractObject = {}, cancelObject?: RequestCancel) {
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

  public setHeaders(headers: AbstractObject) {
    this.headers = headers
  }

  protected async do(method: Method, url: string, payload: Object, cancelObject?: RequestCancel): Promise<AbstractObject> {
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: this.headers,
      params: {},
      data: {},
      cancelToken: this.cancelToken(cancelObject),
    }

    method === 'GET' ? (config.params = payload) : (config.data = payload)

    try {
      const { data } = await this.client({ ...config, ...this.extendedConfig })
      return data || {}
    } catch (error) {
      const message =
        error.response && error.response.data && error.response.data.message
          ? error.response.data.message
          : null
      logger.error(message || error)
      error.serverMessage = message
      throw error
    }
  }

  protected cancelToken(cancelObject?: RequestCancel) {
    return new axios.CancelToken(c => {
      if (cancelObject) {
        cancelObject.setCancelFunction(c)
      }
    })
  }
}
