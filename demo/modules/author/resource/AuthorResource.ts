import Knex from 'knex'
import { EntityFactory } from '../../../../core/entity/EntityFactory'
import { Author, TAuthor } from '../Author'

export class AuthorResource {
  protected readonly connection: Knex
  protected readonly entityFactory: EntityFactory<TAuthor, Author>
  protected table: string = 'author'

  public constructor(connection: Knex, entityFactory: EntityFactory<TAuthor, Author>) {
    this.connection = connection
    this.entityFactory = entityFactory
  }
}
