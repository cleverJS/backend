import { logger } from '../../logger/logger'

class RequestCancel {
  private cancelFunc: Function | null = null

  public setCancelFunction(cancelFunc: Function) {
    this.cancelFunc = cancelFunc
  }

  public cancel = (message: string = 'Cancel HttpClient') => {
    if (this.cancelFunc) {
      this.cancelFunc(message)
      this.cancelFunc = null
    } else {
      logger.warn('Cancel Function is not defined')
    }
  }
}

export { RequestCancel }
