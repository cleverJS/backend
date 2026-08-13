import { routes } from '../decorators/routes'

import { WSServer } from './WSServer'

/**
 * Bind every method decorated with `@route` to a WSServer instance.
 *
 * Kept out of `decorators/routes.ts` so that importing `@route` from the package root does not
 * require the `ws` peer.
 */
export const initRoutes = (wsServer: WSServer) => {
  routes.forEach((route) => {
    wsServer.onRequest(route.service, route.action, route.func)
  })
}
