import { boolean, date, number, object, string } from 'yup'

import { EUserRoles, TUser } from './User'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable().default(null),
    password: string().defined().nonNullable().default(''),
    salt: string().defined().nonNullable().default(''),
    login: string().defined().nonNullable().default(''),
    uuid: string().defined().nonNullable().default(''),
    role: number()
      .oneOf(Object.values(EUserRoles) as number[])
      .defined()
      .default(EUserRoles.user),
    firstName: string().defined().nullable().default(null),
    lastName: string().defined().nullable().default(null),
    restoreToken: string().defined().nullable().default(null),
    active: boolean().defined().default(false),
    data: object().defined().default({}),
    lastVisit: date().defined().nullable().default(null),
    createdAt: date().defined().default(new Date()),
    updatedAt: date().defined().default(new Date()),
  })

export function castUser(data: unknown): Promise<TUser> {
  return scheme.noUnknown().validate(data)
}
