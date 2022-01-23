import { User } from '../modules/user/User'

export type AppEvents = {
  'password-restore': (user: User) => void
  registration: (user: User) => void
}
