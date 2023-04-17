import { date, number, object, string } from 'yup'

import { currentDateFunction } from '../../utils/common'

import { TFile } from './File'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable().default(null),
    code: string().defined().nullable().default(null),
    name: string().defined().default(''),
    mime: string().defined().nullable().default(null),
    baseDir: string().defined().default(''),
    url: string().defined().default(''),
    sort: number().defined().default(100),
    data: object().defined().default({}),
    createdAt: date()
      .transform((castValue, originalValue) => {
        if (!originalValue) {
          return undefined
        }

        return castValue
      })
      .default(currentDateFunction)
      .defined(),
    updatedAt: date()
      .transform((castValue, originalValue) => {
        if (!originalValue) {
          return undefined
        }

        return castValue
      })
      .default(currentDateFunction)
      .defined(),
  })

export const castFile = (data: unknown): Promise<TFile> => {
  return scheme.noUnknown().validate(data)
}
