import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, Canceler, CancelToken, Method } from 'axios'
import fs from 'fs'
import { IncomingMessage } from 'http'
import { Stream } from 'node:stream'
import { types } from 'util'

import { HttpError, TResponseErrorParams } from '../../errors/HttpError'

import { RequestCancel } from './RequestCancel'

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

  public get<T>(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do<T>('GET', url, payload, cancelObject)
  }

  public post<T>(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do<T>('POST', url, payload, cancelObject)
  }

  public put<T>(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do<T>('PUT', url, payload, cancelObject)
  }

  public patch<T>(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do<T>('PATCH', url, payload, cancelObject)
  }

  public delete<T>(url: string, payload: Record<string, any> = {}, cancelObject?: RequestCancel) {
    return this.do<T>('DELETE', url, payload, cancelObject)
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

    try {
      const response = await this.client({ ...config, ...this.extendedConfig })

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(destination)
        response.data.pipe(writer)

        writer.on('finish', resolve)
        writer.on('error', reject)
      })
    } catch (error: any) {
      const isAxiosError = (candidate: any): candidate is AxiosError => {
        return candidate.isAxiosError === true
      }

      const responseErrorParams: TResponseErrorParams = {
        status: null,
        data: {},
        message: '',
      }

      if (isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          responseErrorParams.status = error.response?.status || null

          if (error.response.status === 404) {
            responseErrorParams.message = error.response?.statusText
          } else {
            if (error.response?.data && !(error.response.data instanceof IncomingMessage)) {
              responseErrorParams.data = error.response?.data || {}
            }

            responseErrorParams.message = error.response?.statusText
          }
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js
          responseErrorParams.message = error.request
        } else {
          // Something happened in setting up the request that triggered an Error
          responseErrorParams.message = error.message
        }
      } else if (types.isNativeError(error)) {
        responseErrorParams.message = error.message
      }

      const requestErrorParams = {
        method: 'stream',
        url,
        payload: { ...config.params, ...config.data },
      }

      if (payload instanceof Stream || payload instanceof Buffer) {
        requestErrorParams.payload = '[Stream]'
      }

      throw new HttpError(requestErrorParams, responseErrorParams)
    }
  }
  public setHeaders(headers: Record<string, any>) {
    this.headers = headers
  }

  protected async do<T = Record<string, any>>(method: Method, url: string, payload: Record<string, any>, cancelObject?: RequestCancel): Promise<T> {
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

      const responseErrorParams: TResponseErrorParams = {
        status: null,
        data: {},
        message: '',
      }

      if (isAxiosError(error)) {
        if (error.response) {
          // The request was made and the server responded with a status code
          // that falls out of the range of 2xx
          responseErrorParams.status = error.response?.status || null

          if (error.response.status === 404) {
            responseErrorParams.message = error.response?.statusText
          } else {
            if (error.response?.data && !(error.response.data instanceof IncomingMessage)) {
              responseErrorParams.data = error.response?.data || {}
            }

            responseErrorParams.message = error.response?.statusText
          }
        } else if (error.request) {
          // The request was made but no response was received
          // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
          // http.ClientRequest in node.js

          if (error.code === 'ETIMEDOUT') {
            responseErrorParams.status = 408
            responseErrorParams.message = error.message
          } else {
            for (const [key, value] of Object.entries(error)) {
              responseErrorParams.status = 520
              if (typeof value !== 'object') {
                responseErrorParams.data[key] = value
              }
            }
          }
          responseErrorParams.message = error?.request?.message || ''
        } else {
          // Something happened in setting up the request that triggered an Error
          responseErrorParams.message = error.message
        }
      } else if (types.isNativeError(error)) {
        responseErrorParams.message = error.message
      }

      const requestErrorParams = {
        method,
        url,
        payload: { ...config.params, ...config.data },
      }

      if (payload instanceof Stream) {
        requestErrorParams.payload = '[Stream]'
      }

      throw new HttpError(requestErrorParams, responseErrorParams)
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
