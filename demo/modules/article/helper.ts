import { boolean, date, number, object, string } from 'yup'

import { currentDateFunction } from '../../utils/common'

import { TArticle } from './Article'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable().default(null),
    title: string().required(),
    author: string().required(),
    content: string().defined().nullable().default(null),
    created: date()
      .transform((castValue, originalValue) => {
        if (!originalValue) {
          return undefined
        }

        return castValue
      })
      .default(currentDateFunction)
      .required(),
    isPublished: boolean().defined().default(false),
  })

export const castArticle = (data: unknown): Promise<TArticle> => {
  return scheme.noUnknown().validate(data)
}
