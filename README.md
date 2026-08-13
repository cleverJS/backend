# README

Tool that simplify common development's things:

- http/websocket endpoint creation
- Connections and requests to mysql / postgres / mssql / oracle / sqlite / elasticsearch / redis
- Code splitting by appropriate places
- Logging
- Caching

1. [Wizard guide](./guide/wizard.md) - Step-by-step guide
3. [Lifecycle](./guide/lifecycle.md) - Suggested life cycle (visualization)
5. [Demo](./demo) - Demo application code

**NOTE:**  There is no restriction.

 With this tool, you are free to write your code as you wish.

- You may use the tool partial.
- You may replace suggested Http/WebSocket servers with any.
- You may use your lovely logger.  
- You may use your favorite project structure.
- You may override everything in your way. 

## Logging transports

| Transport | Writes | Rotation |
| --- | --- | --- |
| `TransportConsole` | stdout | — |
| `TransportTelegram` | a Telegram channel, `error` and `warn` only | — |
| `TransportWinston` | `error.log` and `combined.log` | by size, into a fixed ring of 5 files |
| `TransportWinstonRotate` | `<namespace>-<level>-<date>.log` | one file per day, gzipped, dropped past the retention window |

Prefer `TransportWinstonRotate` wherever logs are read by a human or shipped somewhere:
`TransportWinston` is bounded on disk but not addressable by date, so there is no way to ask it for a
given day and the oldest file is dropped whenever traffic happens to fill the ring.

```ts
logger.addTransport(new TransportWinstonRotate('./runtime', { namespace: 'app' }))
```

Defaults are 20MB per file, 30 days of gzipped history, UTC file names and a console transport
alongside the files; see `ITransportWinstonRotateConfig` for the full set. A process that builds
several namespaced loggers must pass `handleProcessEvents: false` on all but one of them — winston
registers one `uncaughtException` listener per logger.

It needs the optional peer dependency `winston-daily-rotate-file`, which is loaded when the transport
is constructed rather than at import time, so a project that does not use it needs nothing installed:

```sh
npm i winston-daily-rotate-file
```

The transport bounds only the files the process writes itself. Whatever goes to stdout is the
process manager's to rotate — under PM2 that means the `pm2-logrotate` module.
