import { boolean, date, number, object, string } from 'yup'

import { currentDateFunction } from '../../utils/common'

import { TArticle } from './Article'

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

export const castArticle = (data: unknown): Promise<TArticle> => {
  return scheme.noUnknown().validate(data)
}
