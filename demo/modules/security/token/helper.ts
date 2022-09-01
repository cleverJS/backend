import { date, number, object, string } from 'yup'

import { TAuthToken } from './AuthToken'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable().default(null),
    userId: number().defined().nullable(false).default(0),
    token: string().defined().nullable(false).default(''),
    refreshToken: string().defined().nullable(false).default(''),
    ttl: date().defined().nullable().default(null),
    createdAt: date().defined().default(new Date()),
    updatedAt: date().defined().default(new Date()),
  })

export function castAuthToken(data: unknown): TAuthToken {
  return scheme.noUnknown().cast(data)
}
