import { AuthorResource } from './resource/AuthorResource'

export class AuthorService {
  protected readonly resource: AuthorResource

  public constructor(resource: AuthorResource) {
    this.resource = resource
  }
}
