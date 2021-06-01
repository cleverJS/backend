import { boolean, number, object, string } from 'yup'
import { TArticle } from './Article'

const scheme = object()
  .defined()
  .shape({
    id: number().defined().nullable(true).default(null),
    title: string().defined().default(''),
    author: string().defined().default(''),
    content: string().defined().default(''),
    isPublished: boolean().defined().default(false),
  })

export const castArticle = (data: unknown): TArticle => {
  return scheme.noUnknown().cast(data)
}
