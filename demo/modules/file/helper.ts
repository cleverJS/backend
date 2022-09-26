import { date, number, object, string } from 'yup'

import { TFile } from './File'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable(true).default(null),
    code: string().defined().nullable(true).default(null),
    name: string().defined().default(''),
    mime: string().defined().nullable(true).default(null),
    baseDir: string().defined().default(''),
    url: string().defined().default(''),
    sort: number().defined().default(100),
    data: object().defined().default({}),
    createdAt: date().default(new Date()).defined(),
    updatedAt: date().default(new Date()).defined(),
  })

export const castFile = (data: unknown): Promise<TFile> => {
  return scheme.noUnknown().validate(data)
}
