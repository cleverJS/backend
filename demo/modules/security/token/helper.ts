import * as yup from 'yup'
import { TAuthToken } from './AuthToken'

const scheme = yup
  .object()
  .required()
  .shape({
    id: yup.number().defined().nullable(),
    userId: yup.number().defined().nullable(false),
    token: yup.string().defined().nullable(false),
    refreshToken: yup.string().defined().nullable(false),
    ttl: yup.date().defined().nullable(),
    createdAt: yup.date().defined().default(new Date()),
    updatedAt: yup.date().defined().default(new Date()),
  })

export function castAuthToken(data: unknown): TAuthToken {
  return scheme.noUnknown().cast(data)
}
