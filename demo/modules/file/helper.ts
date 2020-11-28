import * as yup from 'yup'
import { TFile } from './File'

const scheme = yup
  .object()
  .required()
  .shape({
    id: yup.number(),
    code: yup.string().defined().nullable(true),
    name: yup.string(),
    mime: yup.string().defined().nullable(true),
    baseDir: yup.string(),
    url: yup.string(),
    sort: yup.number().defined().default(100),
    data: yup.object(),
    createdAt: yup.date().default(new Date()).defined(),
    updatedAt: yup.date().default(new Date()).defined(),
  })

export const castFile = (data: unknown): TFile => {
  return scheme.noUnknown().cast(data)
}
