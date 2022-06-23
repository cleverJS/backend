import { boolean, number, object, string, date } from 'yup'
import { TArticle } from './Article'
import { currentDateFunction } from '../../utils/common'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable(true).default(null),
    title: string().defined().default(''),
    author: string().defined().default(''),
    content: string().defined().nullable(true).default(null),
    created: date()
      .transform((castValue, originalValue) => {
        return new Date(originalValue)
      })
      .defined()
      .default(currentDateFunction),
    isPublished: boolean().defined().default(false),
  })

export const castArticle = (data: unknown): TArticle => {
  return scheme.noUnknown().cast(data)
}
