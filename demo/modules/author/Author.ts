import { AbstractEntity } from '../../../core/entity/AbstractEntity'

export type TAuthor = {
  id: number
  name: string
  fileId: number | null
}

export class Author extends AbstractEntity<TAuthor> implements TAuthor {
  public id = 0
  public name = ''
  public fileId = null
}
