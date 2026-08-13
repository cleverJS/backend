/**
 * Requires **both** `express` and `fastify`: the factory holds a static map of every server it can
 * build so it can return the precise instance type. To depend on one server, construct it from
 * `@cleverjs/backend/http/express` or `/http/fastify` instead.
 */
export { HttpServerFactory, THttpServer } from './HttpServerFactory'
