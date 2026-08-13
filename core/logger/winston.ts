/**
 * Requires the `winston` peer. `TransportWinstonRotate` also needs `winston-daily-rotate-file`,
 * which it loads on construction rather than at import time.
 */
export { TransportWinston } from './transport/TransportWinston'
export { TransportWinstonRotate, ITransportWinstonRotateConfig } from './transport/TransportWinstonRotate'
