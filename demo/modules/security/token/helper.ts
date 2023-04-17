import { date, number, object, string } from 'yup'

import { TAuthToken } from './AuthToken'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable().default(null),
    userId: number().defined().nonNullable().default(0),
    token: string().defined().nonNullable().default(''),
    refreshToken: string().defined().nonNullable().default(''),
    ttl: date().defined().nullable().default(null),
    createdAt: date().defined().default(new Date()),
    updatedAt: date().defined().default(new Date()),
  })

export function castAuthToken(data: unknown): Promise<TAuthToken> {
  return scheme.noUnknown().validate(data)
}
