import * as yup from 'yup'
import { EUserRoles, TUser } from './User'

const scheme = yup
  .object()
  .required()
  .shape({
    id: yup.number().defined().nullable(),
    password: yup.string().defined().nullable(false),
    salt: yup.string().defined().nullable(false),
    login: yup.string().defined().nullable(false),
    uuid: yup.string().defined().nullable(false),
    role: yup.number().defined().oneOf([EUserRoles.user, EUserRoles.admin]).default(EUserRoles.user),
    firstName: yup.string().defined().nullable(),
    lastName: yup.string().defined().nullable(),
    restoreToken: yup.string().defined().nullable(),
    active: yup.boolean().defined().default(false),
    data: yup.object().defined(),
    lastVisit: yup.date().defined().nullable(),
    createdAt: yup.date().defined().default(new Date()),
    updatedAt: yup.date().defined().default(new Date()),
  })

export function castUser(data: unknown): TUser {
  return scheme.noUnknown().cast(data)
}
