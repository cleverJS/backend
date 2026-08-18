import { inspect } from 'util'

export interface IArgsStringifyLimits {
  totalChars: number
  argChars: number
  objectDepth: number
  objectBreadth: number
  objectNodes: number
  stringChars: number
  errorDepth: number
  aggregatedErrors: number
}

export const ARGS_STRINGIFY_LIMITS: Readonly<IArgsStringifyLimits> = Object.freeze({
  totalChars: 262144,
  argChars: 65536,
  objectDepth: 12,
  objectBreadth: 1000,
  objectNodes: 50000,
  stringChars: 16384,
  errorDepth: 8,
  aggregatedErrors: 50,
})

const ARGS_PRIMITIVE_TYPES = ['string', 'number', 'boolean', 'bigint', 'undefined']
const CIRCULAR_MARK = '[Circular Object]'
const TRUNCATION_MARK = '[truncated]'
const UNREADABLE_MARK = '[Unreadable]'
const UNSERIALIZABLE_MARK = '[Unserializable]'
const DEPTH_MARK = '[Depth limit reached]'
const BUDGET_MARK = '[Budget exhausted]'
const FAILURE_MARK = '[Unrenderable argument]'
const FUNCTION_MARK = '[Function]'
const SYMBOL_MARK = '[Symbol]'
const UNDEFINED_MARK = '[undefined]'
const OMITTED_KEY = '...'
const ERROR_HEADER_KEY = '[Error]'
const NO_TO_JSON = Symbol('argsStringify.noToJSON')
const NO_SKIP: ReadonlySet<string> = new Set<string>()
const ARGS_MARK_RESERVE = 32
const KEY_COST = 4
const SCALAR_COST = 8
const MARK_OPEN = 0x5b
const MARK_CLOSE = 0x5d
const MARK_LOOKBACK = 32
const BINARY_NAME_MAX = 32
const BINARY_FALLBACK_NAME = 'Binary'
// Every marker in this file opens with `[+`, `[` plus a capital, or `[truncated]`; a JSON array
// never opens with any of those.
const MARK_HEAD = /^\[(?:\+|[A-Z]|t)/

interface ISink {
  parts: string[]
  remaining: number
  markers: number
  overflowed: boolean
}

interface IWalkState {
  limits: IArgsStringifyLimits
  breadth: number
  ancestors: Set<unknown>
  nodes: number
  chars: number
}

interface IErrorContext {
  walk: IWalkState
  seen: Set<unknown>
}

// `markers` is carved out of `limit` up front so that overflow markers, which are appended after the
// content budget is already spent, can never push the result past the caller's cap.
function createSink(limit: number, reserve: number): ISink {
  const capacity = Math.max(limit, 0)
  const markers = Math.min(Math.max(reserve, 0), capacity)

  return { parts: [], remaining: capacity - markers, markers, overflowed: false }
}

function writeMarker(sink: ISink, text: string): void {
  if (sink.markers >= text.length) {
    sink.parts.push(text)
    sink.markers -= text.length
  }
}

function markOverflow(sink: ISink): void {
  if (!sink.overflowed) {
    sink.overflowed = true
    writeMarker(sink, TRUNCATION_MARK)
  }
}

// Cutting between the halves of a surrogate pair emits a lone surrogate, which downstream
// transports (Telegram) rewrite to U+FFFD.
function sliceWellFormed(text: string, max: number): string {
  const lastUnit = text.charCodeAt(max - 1)
  const end = lastUnit >= 0xd800 && lastUnit <= 0xdbff ? max - 1 : max

  return text.slice(0, Math.max(end, 0))
}

// A cut lands wherever the budget runs out, which may be inside a marker the walk already wrote:
// `[Budge` reads as data. `[` also opens a JSON array, so only a marker-shaped head backs the cut
// up. The scan stops at the first `]`, so a cut past a closed marker keeps every character, and it
// is bounded, so marker-free text pays at most MARK_LOOKBACK comparisons.
function markStart(text: string, max: number): number {
  const floor = Math.max(max - MARK_LOOKBACK, 0)

  for (let i = max - 1; i >= floor; i--) {
    const unit = text.charCodeAt(i)
    if (unit === MARK_CLOSE) {
      return -1
    }

    if (unit === MARK_OPEN) {
      return MARK_HEAD.test(text.slice(i, i + 2)) ? i : -1
    }
  }

  return -1
}

function cut(text: string, max: number): string {
  const open = markStart(text, max)

  return open >= 0 ? text.slice(0, open) : sliceWellFormed(text, max)
}

function write(sink: ISink, text: string): void {
  if (sink.remaining <= 0) {
    markOverflow(sink)
    return
  }

  if (text.length <= sink.remaining) {
    sink.parts.push(text)
    sink.remaining -= text.length
    return
  }

  sink.parts.push(cut(text, sink.remaining))
  sink.remaining = 0
  markOverflow(sink)
}

function drain(sink: ISink): string {
  try {
    return sink.parts.join('')
  } catch {
    return FAILURE_MARK
  }
}

function isPrimitiveArg(value: unknown): boolean {
  return ARGS_PRIMITIVE_TYPES.includes(typeof value)
}

// `instanceof` triggers a getPrototypeOf trap, which throws on a revoked Proxy.
function isError(value: unknown): value is Error {
  try {
    return value instanceof Error
  } catch {
    return false
  }
}

function readValue(read: () => unknown): unknown {
  try {
    return read()
  } catch {
    return UNREADABLE_MARK
  }
}

function readText(read: () => unknown): string {
  try {
    const value = read()
    return typeof value === 'string' ? value : String(value)
  } catch {
    return UNREADABLE_MARK
  }
}

function inspectValue(value: unknown, limits: IArgsStringifyLimits): string {
  try {
    return inspect(value, {
      getters: false,
      depth: limits.objectDepth,
      maxArrayLength: limits.objectBreadth,
      maxStringLength: limits.stringChars,
      breakLength: Infinity,
    })
  } catch {
    return UNSERIALIZABLE_MARK
  }
}

function spend(walk: IWalkState, text: string): string {
  walk.chars -= text.length
  return text
}

function cutString(text: string, walk: IWalkState): string {
  const max = Math.max(Math.min(walk.limits.stringChars, walk.chars), 0)
  if (text.length <= max) {
    walk.chars -= text.length + 2
    return text
  }

  const kept = sliceWellFormed(text, max)
  walk.chars -= kept.length + TRUNCATION_MARK.length + 2

  return `${kept}${TRUNCATION_MARK}`
}

// Outside the safe range Number() rounds silently, which would print a wrong id into the log.
function cloneBigInt(value: bigint, walk: IWalkState): unknown {
  const asNumber = Number(value)
  if (Number.isSafeInteger(asNumber)) {
    walk.chars -= SCALAR_COST
    return asNumber
  }

  return spend(walk, `${value.toString()}n`)
}

function clonePrimitive(value: unknown, walk: IWalkState): unknown {
  const type = typeof value
  if (type === 'undefined') {
    return spend(walk, UNDEFINED_MARK)
  }

  if (type === 'function') {
    return spend(walk, FUNCTION_MARK)
  }

  if (type === 'symbol') {
    return spend(walk, SYMBOL_MARK)
  }

  if (type === 'bigint') {
    return cloneBigInt(value as bigint, walk)
  }

  walk.chars -= SCALAR_COST

  return value
}

function readProperty(value: object, key: string): unknown {
  try {
    return Reflect.get(value, key)
  } catch {
    return UNREADABLE_MARK
  }
}

function toJSONResult(value: object): unknown {
  try {
    const candidate = (value as { toJSON?: unknown }).toJSON

    return typeof candidate === 'function' ? (candidate as () => unknown).call(value) : NO_TO_JSON
  } catch {
    return NO_TO_JSON
  }
}

function cloneList(entries: Iterable<unknown>, size: number, walk: IWalkState, depth: number): unknown[] {
  const items: unknown[] = []

  for (const entry of entries) {
    if (items.length >= walk.breadth || walk.chars <= 0 || walk.nodes <= 0) {
      break
    }

    walk.chars -= 1
    items.push(cloneValue(entry, walk, depth + 1))
  }

  if (size > items.length) {
    items.push(spend(walk, `[+${size - items.length} entries omitted]`))
  }

  return items
}

// A marker key is a legal property name, and the name can be attacker supplied: without a free key
// Object.fromEntries would drop one of the two silently.
function freeKey(taken: ReadonlySet<string>, key: string): string {
  let candidate = key
  let suffix = 1

  while (taken.has(candidate)) {
    candidate = `${key}#${suffix}`
    suffix++
  }

  return candidate
}

function clonePlain(value: object, walk: IWalkState, depth: number, skip: ReadonlySet<string>): Record<string, unknown> {
  const keys = Object.keys(value)
  const pairs: [string, unknown][] = []
  let visited = 0

  for (const key of keys) {
    if (pairs.length >= walk.breadth || walk.chars <= 0 || walk.nodes <= 0) {
      break
    }

    visited++
    if (!skip.has(key)) {
      walk.chars -= key.length + KEY_COST
      pairs.push([key, cloneValue(readProperty(value, key), walk, depth + 1)])
    }
  }

  const omitted = keys.length - visited
  if (omitted > 0) {
    const key = freeKey(new Set(pairs.map(([name]) => name)), OMITTED_KEY)
    pairs.push([key, spend(walk, `[+${omitted} entries omitted]`)])
  }

  return Object.fromEntries(pairs)
}

// An empty message would render as a trailing `: `, which is noise the stack never carries.
function errorHeader(name: string, message: string): string {
  if (name.length === 0) {
    return message
  }

  return message.length > 0 ? `${name}: ${message}` : name
}

// name and message are non-enumerable, so JSON semantics render a nested Error as `{}`. An
// enumerable `stack` is kept: dropping it by key would be a silent loss, and cutString bounds it.
function cloneNestedError(value: Error, walk: IWalkState, depth: number): Record<string, unknown> {
  const props = clonePlain(value, walk, depth, NO_SKIP)
  const header = errorHeader(
    readText(() => value.name),
    readText(() => value.message)
  )
  const key = freeKey(new Set(Object.keys(props)), ERROR_HEADER_KEY)

  return { [key]: cutString(header, walk), ...props }
}

interface IBinaryPreview {
  items: Iterable<unknown>
  size: number
}

// The name is read off the value's own constructor, which a caller controls: bounded and reduced to
// identifier characters so that the header can neither grow without limit nor forge a marker.
function binaryName(value: object): string {
  const name = readValue(() => (value as { constructor?: { name?: unknown } }).constructor?.name)
  if (typeof name !== 'string') {
    return BINARY_FALLBACK_NAME
  }

  const identifier = name.slice(0, BINARY_NAME_MAX).replace(/[^A-Za-z0-9_$]/g, '')

  return identifier.length > 0 ? identifier : BINARY_FALLBACK_NAME
}

// A bare SharedArrayBuffer has no own enumerable keys, so without this it would print as `{}`.
function isBinary(value: object): value is ArrayBufferView | ArrayBufferLike {
  return ArrayBuffer.isView(value) || value instanceof ArrayBuffer || (typeof SharedArrayBuffer === 'function' && value instanceof SharedArrayBuffer)
}

function binaryLength(value: ArrayBufferView | ArrayBufferLike): number {
  const bytes = readValue(() => value.byteLength)

  return typeof bytes === 'number' ? bytes : 0
}

// subarray and the Uint8Array view are O(1) windows over the same memory, so nothing is copied.
function binaryPreview(value: ArrayBufferView | ArrayBufferLike, max: number): IBinaryPreview {
  const typed = value as unknown as { subarray?: unknown; length?: unknown }
  if (typeof typed.subarray === 'function') {
    const slice = typed as { subarray: (from: number, to: number) => Iterable<unknown>; length: number }

    return { items: slice.subarray(0, max), size: slice.length }
  }

  const bytes = ArrayBuffer.isView(value)
    ? new Uint8Array(value.buffer, value.byteOffset, Math.min(value.byteLength, max))
    : new Uint8Array(value, 0, Math.min(value.byteLength, max))

  return { items: bytes, size: binaryLength(value) }
}

// Buffer.prototype.toJSON() and Object.keys() on a typed array each materialise one JS value per
// byte inside a call no budget can interrupt, so binary is rendered from a bounded window instead.
function cloneBinary(value: ArrayBufferView | ArrayBufferLike, walk: IWalkState, depth: number): unknown {
  const header = `[${binaryName(value)} ${binaryLength(value)} bytes]`

  let preview: IBinaryPreview
  try {
    preview = binaryPreview(value, walk.breadth)
  } catch {
    return spend(walk, header)
  }

  return { [header]: cloneList(preview.items, preview.size, walk, depth) }
}

function cloneContainer(value: object, walk: IWalkState, depth: number): unknown {
  if (Array.isArray(value)) {
    return cloneList(value, value.length, walk, depth)
  }

  // Map and Set are `{}` to JSON; Map entries stay pairs so that keys sharing a String()
  // representation cannot collapse into one another.
  if (value instanceof Map) {
    return { '[Map]': cloneList(value.entries(), value.size, walk, depth) }
  }

  if (value instanceof Set) {
    return { '[Set]': cloneList(value.values(), value.size, walk, depth) }
  }

  if (isBinary(value)) {
    return cloneBinary(value, walk, depth)
  }

  const replaced = toJSONResult(value)
  if (replaced !== NO_TO_JSON) {
    return cloneValue(replaced, walk, depth)
  }

  return isError(value) ? cloneNestedError(value, walk, depth) : clonePlain(value, walk, depth, NO_SKIP)
}

function cloneObject(value: object, walk: IWalkState, depth: number): unknown {
  // The ancestor test uses the identity of the original value, recorded before any wrapper or
  // substitute is built: a wrapper is a fresh allocation and could never match an ancestor.
  if (walk.ancestors.has(value)) {
    return spend(walk, CIRCULAR_MARK)
  }

  if (depth >= walk.limits.objectDepth) {
    return spend(walk, DEPTH_MARK)
  }

  walk.ancestors.add(value)
  try {
    return cloneContainer(value, walk, depth)
  } catch {
    return spend(walk, UNREADABLE_MARK)
  } finally {
    walk.ancestors.delete(value)
  }
}

// Builds a plain, budgeted copy of `value`. Every bound is enforced here rather than after the
// fact, so the JSON.stringify that follows is bounded by construction.
function cloneValue(value: unknown, walk: IWalkState, depth: number): unknown {
  if (walk.nodes <= 0 || walk.chars <= 0) {
    return BUDGET_MARK
  }

  walk.nodes--

  if (typeof value === 'string') {
    return cutString(value, walk)
  }

  if (typeof value === 'object' && value !== null) {
    return cloneObject(value, walk, depth)
  }

  return clonePrimitive(value, walk)
}

function stringifyClone(clone: unknown): string | undefined {
  try {
    return JSON.stringify(clone) ?? undefined
  } catch {
    return undefined
  }
}

function resetCharBudget(walk: IWalkState, sink: ISink): void {
  walk.chars = Math.min(walk.limits.argChars, Math.max(sink.remaining, 0))
}

function renderValue(value: unknown, sink: ISink, walk: IWalkState): string {
  resetCharBudget(walk, sink)
  const clone = cloneValue(value, walk, 0)

  // A root that could not be enumerated at all keeps its marker and borrows inspect(), which still
  // names a revoked Proxy where the walk has nothing to report.
  if (clone === UNREADABLE_MARK) {
    return `${UNREADABLE_MARK} ${inspectValue(value, walk.limits)}`
  }

  return stringifyClone(clone) ?? inspectValue(value, walk.limits)
}

function readErrorList(error: Error): unknown[] | undefined {
  const errors = readValue(() => (error as { errors?: unknown }).errors)

  return Array.isArray(errors) ? (errors as unknown[]) : undefined
}

// Excluded by key, never by reading: a throwing `stack` or `cause` getter must not cost the error
// its remaining props. `errors` is excluded only when the aggregated renderer will really print it,
// so a Mongoose ValidationError, which keys `errors` by field, keeps it here.
function errorSkipKeys(error: Error): ReadonlySet<string> {
  const skip = new Set(['stack', 'cause'])
  if (readErrorList(error) !== undefined) {
    skip.add('errors')
  }

  return skip
}

function writeErrorProps(error: Error, sink: ISink, ctx: IErrorContext): void {
  resetCharBudget(ctx.walk, sink)

  let props: Record<string, unknown>
  try {
    props = clonePlain(error, ctx.walk, 0, errorSkipKeys(error))
  } catch {
    write(sink, `${UNREADABLE_MARK}\n`)
    return
  }

  if (Object.keys(props).length === 0) {
    return
  }

  write(sink, stringifyClone(props) ?? UNSERIALIZABLE_MARK)
  write(sink, '\n')
}

function writeErrorIdentity(error: Error, sink: ISink): void {
  const stack = readText(() => error.stack)
  const header = errorHeader(
    readText(() => error.name),
    readText(() => error.message)
  )

  // name and message are non-enumerable, so they are only present when the stack already carries them.
  if (header.length > 0 && !stack.startsWith(header)) {
    write(sink, '[Message]: ')
    write(sink, header)
    write(sink, '\n')
  }

  // Written in pieces so that a multi-megabyte stack is never concatenated into a transient copy.
  write(sink, '[Stack trace]: ')
  write(sink, stack)
  write(sink, '\n')
}

function renderNestedError(value: unknown, sink: ISink, ctx: IErrorContext, depth: number): void {
  if (!isError(value)) {
    write(sink, renderValue(value, sink, ctx.walk))
    write(sink, '\n')
    return
  }

  if (ctx.seen.has(value)) {
    write(sink, `${CIRCULAR_MARK}\n`)
    return
  }

  ctx.seen.add(value)
  renderError(value, sink, ctx, depth)
  ctx.seen.delete(value)
}

function writeErrorCause(error: Error, sink: ISink, ctx: IErrorContext, depth: number): void {
  const cause = readValue(() => (error as { cause?: unknown }).cause)
  if (cause === undefined || cause === null) {
    return
  }

  write(sink, '[Caused by]: ')
  renderNestedError(cause, sink, ctx, depth + 1)
}

function writeAggregatedErrors(error: Error, sink: ISink, ctx: IErrorContext, depth: number): void {
  const errors = readErrorList(error)
  if (errors === undefined || errors.length === 0) {
    return
  }

  write(sink, `[Aggregated ${errors.length} errors]:\n`)

  let rendered = 0
  for (const entry of errors) {
    if (rendered >= ctx.walk.limits.aggregatedErrors || sink.remaining <= 0) {
      break
    }

    write(sink, '\t')
    renderNestedError(entry, sink, ctx, depth + 1)
    rendered++
  }

  if (rendered < errors.length) {
    write(sink, `[+${errors.length - rendered} errors omitted]\n`)
  }
}

function renderError(error: Error, sink: ISink, ctx: IErrorContext, depth: number): void {
  if (depth > ctx.walk.limits.errorDepth) {
    write(sink, `${DEPTH_MARK}\n`)
    return
  }

  if (sink.remaining <= 0) {
    markOverflow(sink)
    return
  }

  writeErrorProps(error, sink, ctx)
  writeErrorIdentity(error, sink)
  writeErrorCause(error, sink, ctx, depth)
  writeAggregatedErrors(error, sink, ctx, depth)
}

function renderArgument(value: unknown, sink: ISink, walk: IWalkState): void {
  if (isPrimitiveArg(value)) {
    write(sink, String(value))
    return
  }

  if (typeof value === 'function') {
    write(sink, FUNCTION_MARK)
    return
  }

  if (typeof value === 'symbol') {
    write(sink, SYMBOL_MARK)
    return
  }

  if (isError(value)) {
    renderError(value, sink, { walk, seen: new Set<unknown>([value]) }, 0)
    return
  }

  write(sink, renderValue(value, sink, walk))
}

function createWalk(limits: IArgsStringifyLimits, breadth: number): IWalkState {
  return { limits, breadth, ancestors: new Set<unknown>(), nodes: Math.max(Math.trunc(limits.objectNodes), 1), chars: 0 }
}

function argumentSeparator(value: unknown, index: number): string {
  if (index === 0) {
    return ''
  }

  return isPrimitiveArg(value) ? ' ' : '\n'
}

function appendArguments(args: unknown[], total: ISink, limits: IArgsStringifyLimits, breadth: number): void {
  let index = 0

  for (const current of args) {
    const separator = argumentSeparator(current, index)

    // An argument sink narrower than the truncation mark spends its whole capacity on the reserve
    // and drains to '', so the argument would vanish unmarked. The separator is part of the price:
    // charging it first and testing after would lose one more argument than the count reports.
    if (total.remaining < separator.length + TRUNCATION_MARK.length) {
      markOverflow(total)
      writeMarker(total, `[+${args.length - index} arguments omitted]`)
      return
    }

    write(total, separator)

    const argSink = createSink(Math.min(limits.argChars, total.remaining), TRUNCATION_MARK.length)
    try {
      renderArgument(current, argSink, createWalk(limits, breadth))
    } catch {
      write(argSink, FAILURE_MARK)
    }

    write(total, drain(argSink))
    index++
  }
}

export function createArgsStringify(overrides: Partial<IArgsStringifyLimits> = {}): (...args: unknown[]) => string {
  // `exactOptionalPropertyTypes` is off, so `{ totalChars: cfg.x ? Number(cfg.x) : undefined }` type-checks.
  // Spread as-is it overwrites the default with `undefined`, and the budget arithmetic then yields NaN,
  // which empties the whole line rather than bounding it. The cast is what makes the filter honest:
  // `Object.entries` drops the optionality of `Partial`, so without it the check reads as dead code.
  const provided = overrides as Record<string, number | undefined>
  const defined = Object.fromEntries(Object.entries(provided).filter(([, value]) => value !== undefined))
  const limits: IArgsStringifyLimits = { ...ARGS_STRINGIFY_LIMITS, ...defined }
  const breadth = Math.max(Math.trunc(limits.objectBreadth), 1)
  const reserve = TRUNCATION_MARK.length + ARGS_MARK_RESERVE

  return (...args: unknown[]): string => {
    const total = createSink(limits.totalChars, reserve)
    try {
      appendArguments(args, total, limits, breadth)
    } catch {
      write(total, FAILURE_MARK)
    }

    return drain(total)
  }
}

const defaultArgsStringify = createArgsStringify()

export function argsStringify(...args: unknown[]): string {
  return defaultArgsStringify(...args)
}
