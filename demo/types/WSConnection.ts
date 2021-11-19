import { IConnectionInfo } from '../../core/ws/WSServer'

interface IPermissions {
  user: {
    read: boolean
    write: boolean
  }
}

export interface IConnectionState {
  id: number
  userId: number
  token: string
  permissions: IPermissions
  subscriptions: {
    article: boolean
  }
}

export interface IAppConnectionInfo extends IConnectionInfo {
  state: IConnectionState
}
