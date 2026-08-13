import { User } from '../modules/user/User'

export interface AppEvents {
  'password-restore': [user: User]
  registration: [user: User]
}
