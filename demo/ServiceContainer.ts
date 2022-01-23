import TypedEmitter from 'typed-emitter'
import { ResourceContainer } from './ResourceContainer'
import { ArticleService } from './modules/article/ArticleService'
import { AuthTokenService } from './modules/security/token/AuthTokenService'
import { UserService } from './modules/user/UserService'
import { AuthService } from './modules/security/auth/AuthService'
import { AppEvents } from './types/Events'
import { FileService } from './modules/file/FileService'
import { settings } from './configs'

export class ServiceContainer {
  public readonly articleService: ArticleService
  public readonly userService: UserService
  public readonly authTokenService: AuthTokenService
  public readonly authService: AuthService
  public readonly fileService: FileService

  public constructor(resources: ResourceContainer, eventBus: TypedEmitter<AppEvents>) {
    const { fileResource, articleResource, userResource, authTokenResource } = resources

    this.userService = new UserService(userResource)
    this.authTokenService = new AuthTokenService(authTokenResource)

    this.authService = new AuthService({
      eventBus,
      userService: this.userService,
      authTokenService: this.authTokenService,
    })
    this.articleService = new ArticleService(articleResource)
    this.fileService = new FileService(settings.runtimeDir, fileResource)
  }
}
