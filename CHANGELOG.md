# Changelog

All notable changes to this project are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.1.0] - 2026-08-18

Logging and `Ready`. Every item here is a defect that lost data or work without saying so: a serializer
that stalled the event loop and dropped whole arguments, a Telegram transport that turned one 429 into a
retry flood, a bulk-index failure that logged a copy of every failed document, and a latch that could park
its waiters forever. Nothing in the Websocket surface changes in this release.

The output of the logger changes shape in the cases listed under [Changed](#changed) — read that table if
anything downstream parses log lines. Two `protected` members of `Ready` change with it; both are listed
under [Breaking changes](#breaking-changes), and this ships as a minor deliberately rather than by strict
semver reading.

### Added

- `createArgsStringify(limits?)`, `ARGS_STRINGIFY_LIMITS` (frozen) and `IArgsStringifyLimits` — the log
  serializer is now configurable. `argsStringify` keeps its name, its variadic signature and the default
  limits; the factory exists because a variadic function cannot take an options argument. The limits bound
  work, not only output: `objectNodes`, `objectDepth`, `objectBreadth`, `stringChars`, `argChars`,
  `totalChars`, `errorDepth`.
- `structured` on `TransportWinston` and `TransportWinstonRotate` — hands winston the record as data and
  lets `format.errors({ stack, cause })` + `format.json()` do the work, so the file holds queryable fields
  instead of one flattened string. **Off by default, and the default output is byte-identical to 4.0.0** —
  verified by comparing whole files with `Buffer.equals` under a frozen clock across dev, production and
  production + `APP_DEBUG`. Turn it on only where whatever reads the logs expects JSON.
- `limits?: Partial<IArgsStringifyLimits>` on all three transports (`TransportWinston`,
  `TransportWinstonRotate`, `TransportTelegram`). Without it a transport uses the shared module-level
  `argsStringify` — the same object, so behaviour cannot differ. The option takes limits rather than a
  serialiser function on purpose: an injected function could be unbounded, and the bounds are the whole
  point. A consumer needing full control still has `TransportInterface`.
- `ITelegramMessengerOptions` and `TOutOfBandErrorReporter` (`@cleverjs/backend/telegram`) — where
  `TelegramMessenger` reports its own delivery failures. Defaults to `console.error`; see *Fixed* for why
  it must not be the application logger. The messenger absorbs anything the reporter throws or rejects, so
  supplying an `async` reporter cannot turn a delivery failure into an unhandled rejection.
- `Ready.wait(timeoutMS?)` — waits for the latch and rejects once the deadline passes. Without an argument
  the wait is unbounded, which is what `isResolved()` already did; the argument is the point of the method.
- `Ready.settled` — whether the latch has settled, without parking on it.

### Changed

- **Log output changes shape wherever 4.0.0 printed nothing, printed a falsehood, or printed without end.**
  Every difference below is forced by a data-loss fix: keeping the old text would have meant keeping the
  loss. The four assertions that pinned the format in `tests/utils/common.spec.ts` still pass unchanged, and
  a 34-case corpus was diffed against 4.0.0 to find these. If something downstream parses these lines, this
  is the table to read.

  | Logged value | 4.0.0 | 4.1.0 |
  | --- | --- | --- |
  | `Map` / `Set` | `{}` | `{"[Map]":[["k","v"]]}` / `{"[Set]":[1,2,3]}` |
  | `Error` nested in an object | `{"err":{}}` | `{"err":{"[Error]":"TypeError: nested"}}` |
  | object holding a `BigInt` | `''` — the whole argument was lost | `{"n":10}`; past 2^53 a string, since `Number()` would round in silence |
  | `undefined` as an array element | `[1,null,3]` — a value that was never there | `[1,"[undefined]",3]` |
  | `undefined` as a property value | the key disappeared | `"[undefined]"` |
  | a function or symbol as a property value | `{}` | `{"cb":"[Function]"}` / `{"s":"[Symbol]"}` |
  | the same object referenced twice | `[Circular Object]` on the second — false, it is not a cycle | both rendered in full |
  | `Error` with a `cause` | `{"cause":{}}` | `[Caused by]: ` and the nested error, depth-bounded and cycle-guarded |
  | `AggregateError` | a bare message line, then blank-line-separated blocks | `[Aggregated N errors]:`, one tab-indented entry each, `[+N errors omitted]` past the cap |
  | `Buffer` / typed array | every byte expanded | `{"[Buffer 67108864 bytes]":[…preview…,"[+67107864 entries omitted]"]}` |
  | anything oversized | no limit | cut at the limit, always with a visible marker |

  Truncation markers (`[truncated]`, `[+N entries omitted]`, `[+N arguments omitted]`, `[Depth limit
  reached]`, `[Unreadable]`) are new and deliberate: a cut that leaves no trace is indistinguishable from
  data that was never there, which is the failure this release exists to remove.
- **The serializer moved to `core/logger/argsStringify.ts`.** It was 714 of the 1006 lines of
  `core/utils/common.ts`, a grab-bag module where nobody would look for it — and what it does is format a
  log line (per-argument separators, `[Stack trace]:` / `[Caused by]:` prefixes, write budgets), so it
  belongs with the logger. `common.ts` is 302 lines now and re-exports the four names marked
  `@deprecated`; the transports import the new path, which also removes a `logger/ → utils/` edge.
  **Nothing changes for consumers**: `exports` in `package.json` never exposed `./utils/common`, so the
  package root is the only way in and it exports the same four names as before. The deprecation marker is
  therefore aimed at in-repo call sites, where it is enforced by `sonarjs/deprecation`, and at anyone
  reaching past `exports` into the shipped sources or declarations.
- **`removeComments` is off, so the published declarations carry their doc comments.** `tsconfig.prod.json`
  stripped every JSDoc from `dist/types`, which cost consumers hover documentation across the whole API and
  swallowed the `@deprecated` markers above. Declarations grow 27 KB (62 KB → 89 KB, +44%), which is 1.6% of
  the build.
- **`TransportTelegram` now truncates to one Telegram message by default.** The Bot API caps a message at
  4096 characters and `TelegramMessenger` splits anything longer into that many separate sends, so with the
  process-wide `totalChars` one oversized error log cost up to **64 sends** — well past Telegram's per-chat
  flood limit, and the 429 that followed is what ignited the loop described in *Fixed*. The transport now
  defaults to 4096 minus the widest `` `${time} [${level}] ` `` prefix it can emit, and that prefix is
  measured from the same code that composes the line rather than hard-coded, so adding a level or changing
  the line shape re-derives the bound instead of silently overflowing into a second send. Telegram is an
  alerting channel, not a log store: the gist belongs there, the detail in the file transport. Raise it per
  field with `new TransportTelegram(messenger, { limits: { totalChars: … } })` — one extra send per 4096
  characters — and note the cut is always marked with `[truncated]`.
- **`chunkString` no longer splits a surrogate pair** (it is exported from the package root, so this affects
  every caller). A chunk may now be one UTF-16 unit *shorter* than `length`, never longer — safe for a caller
  using `length` as a hard cap — and reassembling the chunks still reproduces the input exactly. Two
  degenerate cases changed with it: `length <= 0` throws `RangeError` explicitly instead of reaching
  `new Array(Infinity)`, and a non-integer `length` is truncated rather than producing overlapping chunks
  that were *longer* than requested (`chunkString('abcdefgh', 2.5)` used to yield `["ab","cde","fg","h"]`).
- **`TelegramMessenger` delivery failures now go to `console.error`, not the application logger.** That is
  the fix for the loop in *Fixed*, and it has a cost worth stating: an operator watching only the file log
  no longer sees them and depends on the supervisor capturing stderr. Pass `reportError` to route them
  somewhere durable — any logger with no Telegram transport on it.

### Fixed

- **`argsStringify` no longer stalls the event loop, and no longer loses whole arguments in silence.** It is
  called synchronously on the caller's stack by every winston and Telegram transport, and `Logger.error` is
  ungated, so both defects landed on per-message WS failure paths. Six of them, each reproduced before the
  fix and pinned by a test after it:
  - the `AggregateError` branch serialized the **whole** `errors` array once per non-`Error` entry —
    `JSON.stringify(errors)` where `error` was meant. Quadratic: 1000 entries produced 69 MB in 91 ms, 3000
    entries hit V8's string ceiling at 537 MB after 605 ms. Now 400 000 entries render in 1 ms;
  - the `catch` fell back to `JSONStringifySafe`, which is the same `JSON.stringify` that had just thrown, so
    every cause recurred and the fallback returned `''`. A `BigInt` property, a throwing getter or a deep
    graph made the **entire argument vanish** — including the `Error` — leaving a log line that read as
    complete;
  - the `Error` branch serialized its own properties **without** a circular guard, unlike the object branch.
    An error carrying a circular property (a request, a socket) lost its stack *and* its message;
  - `cause`, `message` and `name` are non-enumerable, so rest-destructuring dropped them. `WSParseError` is
    thrown with `{ cause }`, so the `SyntaxError` explaining what was wrong with a client's frame never
    reached the log;
  - `getCircularReplacer` marked "seen anywhere", not "is an ancestor", so a **repeated sibling** — a DAG,
    not a cycle — was replaced with `[Circular Object]`. Real data, overwritten with a claim that was false;
  - nothing bounded the output. A `Buffer`, a 500 000-key object or a 50 MB stack was serialized in full,
    synchronously, and handed to disk and to Telegram.
- **A failed Elasticsearch bulk no longer logs every failed document.** `erroredDocuments` carried one full
  source document per failure; the log line now carries `index`, `failed`, `total` and a five-entry sample of
  `{ position, id, status, error }`. `id` rather than only `position`, because an index into a `dataset`
  nobody holds any more is not something an operator can search on.
- **A failed Telegram delivery no longer feeds itself.** `TelegramMessenger` reported its own send failures
  through `loggerNamespace('TelegramMessenger')` — the module-global logger that an application registers
  `TransportTelegram` on, which is the documented way to use it. So a failed send logged an error, the error
  fanned out to every transport, `TransportTelegram` called `send` again, and that failed too: each failure
  produced exactly one more send, forever. Measured against a stub failing N times, the messenger issued
  N+1 requests at N = 40, 200 and 500, stopping only once Telegram began answering — turning a transient 429
  into a self-sustaining one. Failures now go to an out-of-band reporter that has no path back into
  Telegram. `send` keeps its old contract and still never rejects, including when the reporter itself throws,
  returns a rejected promise, or is `async` and rejects — a rejection there would have become an unhandled
  rejection in a consumer who never wrote `.catch`, which is a crash traded for a loop.
- **`limits: { totalChars: undefined }` no longer empties the log line.** `exactOptionalPropertyTypes` is
  off, so `{ totalChars: cfg.value ? Number(cfg.value) : undefined }` type-checks; the `undefined` then fed
  `NaN` through the budget arithmetic and the transport emitted a timestamp, a level and nothing else. An
  alert that fires carrying no information is worse than no alert. Undefined-valued overrides are dropped
  before the merge, so the default stands.
- **`Ready.reset()` no longer parks its waiters forever.** `resolve` and `reject` were class fields holding
  no-op placeholders, and the real implementations were installed by `getPromise()` from the constructor
  body. Field initialisers run before that body, so the shape worked only by ordering: `reset()` armed a
  fresh promise while a caller already parked on the previous one kept the placeholders, and was neither
  resolved nor rejected. The wait never ended, and nothing was logged, because from the latch's point of
  view nothing had failed.

  The promise, its settle functions and a `settled` flag now live in one latch object that is replaced
  whole, so no waiter can hold one half of a pair. The latch carries its own `catch`: it is rejected from
  event handlers, which is precisely when no caller happens to be parked on it, and an unhandled rejection
  there terminates the process by default.

### Breaking changes

None of these is a compile error for a plain consumer — the package root exports the same names it did in
4.0.0. They are listed because two touch the `protected` surface, which ships in the declarations, and one
changes bytes that something downstream may be parsing.

| Change | Who is affected | What to do |
| --- | --- | --- |
| Log output changes shape for `Map`/`Set`, a nested `Error`, an object holding a `BigInt`, `undefined` in an array or as a property value, a function or symbol value, a repeated reference, an `Error` with a `cause`, an `AggregateError`, a `Buffer`, and anything past the new limits | anything that parses log lines | Read the table under [Changed](#changed). Every difference is forced by one of the fixes; the four assertions that pinned the format in `tests/utils/common.spec.ts` still pass unchanged, and the default winston line shape (`timestamp level: message`) is untouched |
| `Ready`: `protected getPromise()` is removed | a subclass overriding it | Nothing, unless you overrode it. It created the promise **and** rewired `this.resolve`/`this.reject`, so an override participated in the defect above. There is deliberately no shim: one that merely returned the promise would leave an override silently uncalled, which is the same class of failure this release removes. `protected promise` is kept as a `@deprecated` getter, so reading it still compiles |
| `Ready.reject()` rejects with an `Error` | a caller catching the rejection | It took no argument and rejected with `false`. Read `error.message`, or pass your own `Error` |
| `chunkString(input, length)` throws `RangeError` on a non-positive `length`, and truncates a non-integer one | it is exported from the package root | A non-positive length reached `new Array(Infinity)` and threw anyway; a non-integer one produced overlapping chunks **longer** than requested (`chunkString('abcdefgh', 2.5)` yielded `["ab","cde","fg","h"]`). Pass an integer. A chunk may now be one UTF-16 unit shorter than `length`, never longer, and reassembly still reproduces the input exactly |

### Known limitations

Accepted deliberately, with reasons, so they are not rediscovered as bugs:

- **`argsStringify` bounds its own work, but it cannot bound the cost of being handed a large object.**
  `Object.keys()` on a 500 000-key object allocates a 500 000-entry array before any limit can apply: 61 ms
  and 116 MB, for 10 KB of output. The cost is proportional to the input, never amplified — but the walk is
  the wrong place to fix it. Do not hand a whole result set to the logger; log a count and a sample, the way
  `AbstractElasticIndex` now does.
- **A DAG is serialized once per path, not once per node.** Cycle detection asks "is this an ancestor",
  which is what makes a repeated sibling render in full instead of a false `[Circular Object]`. The price is
  that a graph with many paths to the same node repeats it, bounded by `objectNodes` and `totalChars`.
  Bounded, but repetitive.
- **`RegExp`, `Promise`, `WeakMap` and other exotics still render `{}`**, as they do under plain
  `JSON.stringify`. Only `Error`, `Map`, `Set` and binary views are special-cased; each further case is
  another change to a format consumers may parse.
- **`totalChars` below 11 yields an empty string.** No truncation marker fits under the width of
  `[truncated]`, and emitting a fragment of a marker would be its own kind of lie. Empty cannot be mistaken
  for complete.
- **Structured mode bounds a record to ~65.6 KB, not to exactly 65 536.** The `level`/`timestamp` envelope
  winston adds is outside the accounting — about 0.2% over, against the 20× overshoot it replaced.
