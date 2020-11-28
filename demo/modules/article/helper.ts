import * as yup from 'yup'
import { TArticle } from './Article'

const scheme = yup.object().required().shape({
  id: yup.number(),
  title: yup.string(),
  author: yup.string(),
  content: yup.string(),
  isPublished: yup.boolean(),
})

export const castArticle = (data: unknown): TArticle => {
  return scheme.noUnknown().cast(data)
}
