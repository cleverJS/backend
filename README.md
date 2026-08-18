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

## Entry points

The package root carries no peer dependency: importing `@cleverjs/backend` pulls in nothing but
`pretty-hrtime`. Everything that needs a third-party package lives behind its own entry point, so a
project installs only what it actually uses.

UUIDs come from `node:crypto.randomUUID()` through the `uuidV4()` wrapper in
`core/utils/uuid.ts` — the one place to change if the format or the source of randomness needs to
differ.

| Entry point | Exports | Needs |
| --- | --- | --- |
| `@cleverjs/backend` | services, entities, cache, `Condition`, logger, `HttpServer`, WS wire protocol, utils | — |
| `@cleverjs/backend/http` | `HttpServer`, `IHttpServerConfig`, `RequestCancel` | — |
| `@cleverjs/backend/http/client` | `HttpClient` | `axios` |
| `@cleverjs/backend/http/express` | `HttpServerExpress` | `express` |
| `@cleverjs/backend/http/fastify` | `HttpServerFastify` | `fastify` |
| `@cleverjs/backend/http/factory` | `HttpServerFactory`, `THttpServer` | `express` **and** `fastify` |
| `@cleverjs/backend/ws` | `WSServer`, `WSClient`, `initRoutes` | `ws` |
| `@cleverjs/backend/db/sql` | `AbstractDBResource`, `DBKnexResource`, `ConditionDbParser`, … | `knex` (types only) |
| `@cleverjs/backend/db/redis` | `Redis`, `CacheAdapterRedis` | `redis` |
| `@cleverjs/backend/db/elasticsearch` | `AbstractElasticIndex` | `@elastic/elasticsearch` 7.x (types only) |
| `@cleverjs/backend/logger/winston` | `TransportWinston`, `TransportWinstonRotate` | `winston` |
| `@cleverjs/backend/telegram` | `TelegramMessenger`, `TransportTelegram` | `telegraf` |

"Types only" means nothing loads the package at runtime — the client or query builder is injected —
but the published declarations reference its types, so it must be installed to typecheck against them.

Every peer is optional and several accept more than one major (`fastify` 4 or 5, `knex` 2 or 3,
`express` 4 or 5, `redis` 4 or 5, `winston-daily-rotate-file` 4 or 5). Each declared major is
typechecked and tested in CI rather than assumed compatible. `@elastic/elasticsearch` is the one
hard ceiling: `AbstractElasticIndex` imports `@elastic/elasticsearch/api/requestParams` and
`/lib/Transport`, neither of which exists in 8.x.

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

### Bounding what a log line costs

Every transport serializes its arguments through `argsStringify`, synchronously, on the caller's stack —
and `Logger.error` is not gated by config, so a failure path pays this in full. The serializer bounds its
own work: `objectNodes`, `objectDepth`, `objectBreadth`, `stringChars`, `argChars`, `totalChars` and
`errorDepth`, with the defaults frozen in `ARGS_STRINGIFY_LIMITS`. Every cut leaves a visible marker
(`[truncated]`, `[+N entries omitted]`, `[Depth limit reached]`), because a cut that leaves no trace reads
as data that was never there.

Raise or lower them per transport with `limits`, which takes limits rather than a serializer function on
purpose — an injected function could be unbounded, and the bound is the point:

```ts
new TransportWinstonRotate('./runtime', { namespace: 'app', limits: { totalChars: 1_048_576 } })
```

`TransportTelegram` is bounded to a single Telegram message by default. The Bot API caps one message at
4096 characters and `TelegramMessenger` splits anything longer into that many separate sends, so one
oversized record used to cost up to 64 of them — past the per-chat flood limit. Telegram is an alerting
channel, not a log store: the gist belongs there and the detail in the file transport.

What the serializer cannot bound is the cost of being handed a large object in the first place —
`Object.keys()` on a 500 000-key object allocates the whole key array before any limit applies. Log a
count and a sample, not a result set.

`structured: true` on either winston transport hands winston the record as data instead of one flattened
string, so the file holds queryable fields. It is off by default and the default output is byte-identical
to 4.0.0; turn it on only where whatever reads the logs expects JSON.
