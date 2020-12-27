import { IConnection } from '../../core/ws/WSServer'

interface IPermissions {
  user: {
    read: boolean
    write: boolean
  }
}

export interface IConnectionState {
  userId: number
  token: string
  permissions: IPermissions
  subscriptions: {
    article: boolean
  }
}

export interface IAppConnection extends IConnection {
  state: IConnectionState
}
