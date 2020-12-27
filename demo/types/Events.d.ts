import { User } from '../modules/user/User'

export interface AppEvents {
  'password-restore': (user: User) => void
  registration: (user: User) => void
}
