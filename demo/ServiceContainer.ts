import { Knex } from 'knex'
import TypedEmitter from 'typed-emitter'

import { ArticleInitializer, ArticleService } from './modules/article'
import { FileInitializer, FileService } from './modules/file'
import { AuthService } from './modules/security/auth/AuthService'
import { AuthTokenInitializer, AuthTokenService } from './modules/security/token'
import { UserInitializer, UserService } from './modules/user'
import { AppEvents } from './types/Events'

export class ServiceContainer {
  public readonly articleService: ArticleService
  public readonly userService: UserService
  public readonly authTokenService: AuthTokenService
  public readonly authService: AuthService
  public readonly fileService: FileService

  public constructor(connection: Knex, eventBus: TypedEmitter<AppEvents>) {
    this.userService = new UserInitializer(connection).service
    this.authTokenService = new AuthTokenInitializer(connection).service

    this.authService = new AuthService({
      eventBus,
      userService: this.userService,
      authTokenService: this.authTokenService,
    })
    this.articleService = new ArticleInitializer(connection).service
    this.fileService = new FileInitializer(connection).service
  }
}
