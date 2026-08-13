/** Requires the `ws` peer. */

export { WSServer, IConnectionInfo, RequestHandler, WS_DEBUG } from './WSServer'
export { WSClient, TResult, TResponse, TRequest, EVENT_OPEN, EVENT_RECONNECT, EVENT_ERROR, EVENT_CLOSE, EVENT_TERMINATED } from './WSClient'
export { initRoutes } from './initRoutes'

// Peer-free; re-exported here for convenience, also available from the package root.
export { WSRequest, IWSRequest, IWSRequestHeader } from './WSRequest'
export { WSResponse, EWSResponseType, IWSResponseHeader, IWSResponse } from './WSResponse'
export { IWSConfig } from './config'
