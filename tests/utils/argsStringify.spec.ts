import { ARGS_STRINGIFY_LIMITS, argsStringify, createArgsStringify, IArgsStringifyLimits } from '../../core/logger/argsStringify'

const isWellFormed = (value: string): boolean => (value as unknown as { isWellFormed: () => boolean }).isWellFormed()

const TRUNCATION_MARK_LENGTH = '[truncated]'.length

// The complete marker vocabulary of the module. What survives these replacements may still hold a
// `[` that opens a JSON array, so only a marker-shaped head left over is a marker cut in half.
const NAMED_MARK =
  /\[(?:Circular Object|truncated|Unreadable|Unserializable|Depth limit reached|Budget exhausted|Unrenderable argument|Function|Symbol|undefined|Error|Map|Set|Message|Stack trace|Caused by)]/g
const COUNTED_MARK = /\[(?:Aggregated \d+ errors|\+\d+ (?:entries|errors|arguments) omitted|[\w$]+ \d+ bytes)]/g
const PARTIAL_MARK = /\[(?:\+|[A-Z]|t)/

const withoutMarks = (value: string): string => value.replace(NAMED_MARK, '').replace(COUNTED_MARK, '')

// A generous ceiling only guards against a true hang; every test below carries a deterministic
// assertion on output size or on how much of the input was touched.
const HANG_GUARD_MS = 30000

interface ITimed {
  result: string
  elapsed: number
}

const timed = (run: () => string): ITimed => {
  const start = Date.now()
  const result = run()

  return { result, elapsed: Date.now() - start }
}

// Counts how many property reads the serialiser performs, which is the bound that actually matters.
const countingObject = (size: number, counter: { reads: number }): Record<string, unknown> => {
  const target: Record<string, unknown> = {}
  for (let i = 0; i < size; i++) {
    Object.defineProperty(target, `k${i}`, {
      enumerable: true,
      get: () => {
        counter.reads++
        return i
      },
    })
  }

  return target
}

describe('argsStringify errors and hostile values', () => {
  test('should not be quadratic on an AggregateError full of non-Error entries', () => {
    const errors = Array.from({ length: 3000 }, (_, i) => ({ i }))
    const { result, elapsed } = timed(() => argsStringify(new AggregateError(errors, 'big')))

    expect(result).toContain('[Aggregated 3000 errors]')
    expect(result).toContain('[+2950 errors omitted]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should bound an enumerable .errors array on a non-AggregateError', () => {
    const error = Object.assign(new Error('validation failed'), {
      errors: Array.from({ length: 200000 }, (_, i) => ({ i, msg: 'bad' })),
    })

    const { result, elapsed } = timed(() => argsStringify(error))

    expect(result).toContain('[Aggregated 200000 errors]')
    expect(result).toContain('[+199950 errors omitted]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should serialise BigInt instead of dropping the whole argument', () => {
    expect(argsStringify({ n: 10n })).toEqual('{"n":10}')
  })

  test('should not round a BigInt past the safe integer range', () => {
    expect(argsStringify({ n: 18446744073709551617n })).toEqual('{"n":"18446744073709551617n"}')
  })

  test('should survive a throwing getter without losing the readable props', () => {
    const value = {
      a: 1,
      get boom(): never {
        throw new Error('nope')
      },
    }

    expect(argsStringify(value)).toEqual('{"a":1,"boom":"[Unreadable]"}')
  })

  test('should survive a throwing toJSON', () => {
    const value = {
      a: 1,
      toJSON(): never {
        throw new Error('nope')
      },
    }

    expect(argsStringify(value)).toContain('"a":1')
  })

  test('should honour a working toJSON', () => {
    expect(argsStringify({ at: new Date('2020-01-02T03:04:05.000Z') })).toEqual('{"at":"2020-01-02T03:04:05.000Z"}')
  })

  test('should not loop on a toJSON that returns its own receiver', () => {
    const value = {
      toJSON(): unknown {
        return this
      },
    }

    expect(argsStringify(value)).toEqual('"[Circular Object]"')
  })

  test('should survive a revoked Proxy', () => {
    const revocable = Proxy.revocable({ a: 1 }, {})
    revocable.revoke()

    expect(() => argsStringify(revocable.proxy)).not.toThrow()
    expect(argsStringify(revocable.proxy)).toEqual('[Unreadable] <Revoked Proxy>')
  })

  test('should mark a root whose keys cannot be listed instead of printing an empty object', () => {
    const hostile = new Proxy(
      {},
      {
        ownKeys: (): never => {
          throw new Error('no keys for you')
        },
      }
    )

    expect(argsStringify(hostile)).toContain('[Unreadable]')
  })

  test('should keep stack and message of an Error carrying a circular property', () => {
    const ctx: Record<string, unknown> = { a: 1 }
    ctx.self = ctx

    const result = argsStringify(Object.assign(new Error('circular property'), { ctx }))

    expect(result).toContain('[Circular Object]')
    expect(result).toContain('"a":1')
    expect(result).toContain('[Stack trace]:')
    expect(result).toContain('circular property')
  })

  test('should render the cause chain', () => {
    const cause = new SyntaxError('Unexpected token }')
    const result = argsStringify(new Error('Request parse error', { cause }))

    expect(result).toContain('[Caused by]:')
    expect(result).toContain('Unexpected token }')
  })

  test('should terminate on a cause cycle', () => {
    const first = new Error('first') as Error & { cause?: unknown }
    const second = new Error('second', { cause: first })
    first.cause = second

    const result = argsStringify(first)

    expect(result).toContain('[Caused by]:')
    expect(result).toContain('[Circular Object]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
  })

  test('should bound a long non-cyclic cause chain', () => {
    let error = new Error('root')
    for (let i = 0; i < 1000; i++) {
      error = new Error(`level ${i}`, { cause: error })
    }

    const result = argsStringify(error)

    expect(result).toContain('[Depth limit reached]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
  })

  test('should still show the message when stack is undefined', () => {
    const error = new Error('no stack here')
    error.stack = undefined

    expect(argsStringify(error)).toContain('no stack here')
  })

  // Pins the exclusion list of writeErrorProps: narrowing it back to `stack` alone duplicates both
  // keys into the props line, and dropping `errors` from it loses the Mongoose-shaped object below.
  test('should not duplicate an enumerable cause or errors array into the props line', () => {
    const error = Object.assign(new Error('outer'), {
      cause: new Error('inner cause'),
      errors: [new Error('aggregated one')],
      keep: 'visible',
    })

    const result = argsStringify(error)

    expect(result).toContain('"keep":"visible"')
    expect(result).not.toContain('"cause"')
    expect(result).not.toContain('"errors"')
    expect(result.match(/inner cause/g)).toHaveLength(1)
    expect(result).toContain('[Caused by]:')
    expect(result).toContain('[Aggregated 1 errors]')
  })

  test('should keep a non-array errors property, as Mongoose ValidationError produces', () => {
    const error = Object.assign(new Error('Validation failed'), {
      errors: {
        email: { message: 'Path `email` is required.', kind: 'required' },
        name: { message: 'Path `name` is required.', kind: 'required' },
      },
    })

    const result = argsStringify(error)

    expect(result).toContain('Path `email` is required.')
    expect(result).toContain('Path `name` is required.')
    expect(result).not.toContain('[Aggregated')
  })

  test('should keep the other props when the stack getter throws', () => {
    const error = new Error('boom')
    Object.defineProperty(error, 'stack', {
      enumerable: true,
      get: (): never => {
        throw new Error('no stack for you')
      },
    })
    Object.assign(error, { requestId: 'abc-1' })

    const result = argsStringify(error)

    expect(result).toContain('"requestId":"abc-1"')
    expect(result).toContain('[Unreadable]')
  })

  test('should render a nested Error instead of an empty object', () => {
    const result = argsStringify({ ctx: 1, err: new TypeError('nested boom') })

    expect(result).toContain('"[Error]":"TypeError: nested boom"')
    expect(result).toContain('"ctx":1')
  })

  // `new Error()` carries a name but no message, and the stack starts with the bare name: a
  // `${name}: ${message}` header would not match it and would print an empty [Message] line.
  test('should not print a message line for an Error without a message', () => {
    const result = argsStringify(new Error())

    expect(result).not.toContain('[Message]')
    expect(result).toContain('[Stack trace]: Error')
  })

  test('should render a nested Error without a message as its bare name', () => {
    expect(argsStringify({ e: new RangeError() })).toEqual('{"e":{"[Error]":"RangeError"}}')
  })

  test('should keep a real property whose name collides with the error header key', () => {
    const error = Object.assign(new Error('boom'), { '[Error]': 'REAL VALUE' })

    expect(argsStringify({ e: error })).toEqual('{"e":{"[Error]#1":"Error: boom","[Error]":"REAL VALUE"}}')
  })

  // `stack` is non-enumerable on a real Error, so this only fires when someone redefines it. It is
  // rendered rather than skipped by key: a skip would drop a property with nothing to show for it.
  test('should render an enumerable stack of a nested Error', () => {
    const error = new Error('nested')
    Object.defineProperty(error, 'stack', { enumerable: true, value: 'STACKVALUE', configurable: true })

    expect(argsStringify({ e: error })).toEqual('{"e":{"[Error]":"Error: nested","stack":"STACKVALUE"}}')
  })
})

// Buffer.prototype.toJSON() and Object.keys() on a typed array each materialise one JS value per
// byte inside a call no budget can interrupt: a 64MB request body used to kill the process.
describe('argsStringify binary payloads', () => {
  test('should render a Buffer as a type, a byte count and a bounded preview', () => {
    expect(argsStringify(Buffer.from([1, 2, 3]))).toEqual('{"[Buffer 3 bytes]":[1,2,3]}')
    expect(argsStringify({ body: Buffer.from('hi') })).toEqual('{"body":{"[Buffer 2 bytes]":[104,105]}}')
  })

  test('should render every ArrayBuffer view kind', () => {
    expect(argsStringify(new Uint8Array([1, 2, 3]))).toEqual('{"[Uint8Array 3 bytes]":[1,2,3]}')
    expect(argsStringify(new Float64Array([1.5, 2.5]))).toEqual('{"[Float64Array 16 bytes]":[1.5,2.5]}')
    expect(argsStringify(new BigInt64Array([1n, 2n]))).toEqual('{"[BigInt64Array 16 bytes]":[1,2]}')
    expect(argsStringify(new ArrayBuffer(2))).toEqual('{"[ArrayBuffer 2 bytes]":[0,0]}')
    expect(argsStringify(new DataView(new ArrayBuffer(2)))).toEqual('{"[DataView 2 bytes]":[0,0]}')
    expect(argsStringify(new SharedArrayBuffer(2))).toEqual('{"[SharedArrayBuffer 2 bytes]":[0,0]}')
  })

  test('should cap the preview at the breadth limit and mark the rest', () => {
    const stringify = createArgsStringify({ objectBreadth: 4 })

    expect(stringify(Buffer.alloc(10, 7))).toEqual('{"[Buffer 10 bytes]":[7,7,7,7,"[+6 entries omitted]"]}')
    expect(stringify(new Float64Array(10))).toEqual('{"[Float64Array 80 bytes]":[0,0,0,0,"[+6 entries omitted]"]}')
  })

  test('should bound a type name the caller controls', () => {
    const hostile = new Uint8Array([1, 2])
    Object.defineProperty(hostile, 'constructor', { value: { name: `] forged [${'n'.repeat(1000)}` } })

    expect(argsStringify(hostile)).toEqual(`{"[forged${'n'.repeat(22)} 2 bytes]":[1,2]}`)
  })

  // The omitted count is the proof of the bound: 1000 of 16777216 bytes were ever looked at.
  test('should not read a 16MB Buffer byte by byte', () => {
    const { result, elapsed } = timed(() => argsStringify(Buffer.alloc(16 * 1024 * 1024)))

    expect(result).toContain('[Buffer 16777216 bytes]')
    expect(result).toContain(`[+${16 * 1024 * 1024 - ARGS_STRINGIFY_LIMITS.objectBreadth} entries omitted]`)
    expect(result.length).toBeLessThan(10000)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should not read a 10000000 element Float64Array element by element', () => {
    const { result, elapsed } = timed(() => argsStringify(new Float64Array(1e7)))

    expect(result).toContain('[Float64Array 80000000 bytes]')
    expect(result).toContain(`[+${1e7 - ARGS_STRINGIFY_LIMITS.objectBreadth} entries omitted]`)
    expect(result.length).toBeLessThan(10000)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })
})

describe('argsStringify cycles and shared references', () => {
  test('should serialise a repeated sibling reference in full', () => {
    const shared = { id: 1 }

    expect(argsStringify({ a: shared, b: shared })).toEqual('{"a":{"id":1},"b":{"id":1}}')
  })

  test('should still mark a real cycle', () => {
    const value: Record<string, unknown> = { a: 1 }
    value.b = value

    expect(argsStringify(value)).toEqual('{"a":1,"b":"[Circular Object]"}')
  })

  test('should keep Map entries whose keys share a String() representation', () => {
    const map = new Map<Record<string, number>, string>([
      [{ id: 1 }, 'first'],
      [{ id: 2 }, 'second'],
    ])

    const result = argsStringify(map)

    expect(result).toContain('{"id":1}')
    expect(result).toContain('{"id":2}')
    expect(result).toContain('first')
    expect(result).toContain('second')
  })

  test('should expand a Set and a nested Map', () => {
    expect(argsStringify(new Set([1, 2, 3]))).toEqual('{"[Set]":[1,2,3]}')
    expect(argsStringify({ m: new Map([['k', 'v']]) })).toEqual('{"m":{"[Map]":[["k","v"]]}}')
  })

  test('should mark a truncated collection instead of dropping entries silently', () => {
    const map = new Map(Array.from({ length: 5000 }, (_, i) => [i, i]))

    expect(argsStringify(map)).toContain('[+4000 entries omitted]')
  })

  test('should mark a self-referencing Map without exploding', () => {
    const map = new Map<string, unknown>()
    for (let i = 0; i < 60; i++) {
      map.set(`k${i}`, map)
    }

    const { result, elapsed } = timed(() => argsStringify(map))

    expect(result).toContain('[Circular Object]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(result.match(/\[Circular Object]/g)).toHaveLength(60)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should mark a Set whose members point back at it without exploding', () => {
    const set = new Set<unknown>()
    for (let i = 0; i < 2000; i++) {
      set.add({ i, ref: set })
    }

    const { result, elapsed } = timed(() => argsStringify(set))

    expect(result).toContain('[Circular Object]')
    expect(result).toContain('[+1000 entries omitted]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should mark an over-breadth array whose entries point back at it', () => {
    const array: unknown[] = new Array(1001).fill(null)
    array.fill(array)

    const { result, elapsed } = timed(() => argsStringify(array))

    expect(result).toContain('[Circular Object]')
    expect(result).toContain('[+1 entries omitted]')
    expect(result).not.toContain('null')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  // The shape an ORM result set or an ES bulk response produces: every row holds a back-pointer to
  // the batch it came from. Identity-against-ancestors is what keeps this linear.
  test('should render a row batch whose rows point back at the batch', () => {
    const rows: Record<string, unknown>[] = Array.from({ length: 1500 }, (_, id) => ({ id, status: 'failed' }))
    for (const row of rows) {
      row.batch = rows
    }

    const { result, elapsed } = timed(() => argsStringify('bulk write failed', { rows }))

    expect(result).toContain('bulk write failed')
    expect(result).toContain('"batch":"[Circular Object]"')
    expect(result).toContain('[+500 entries omitted]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.totalChars)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  // No cycle at all: three wide arrays nested into each other still multiply out to 1500^3 nodes
  // unless the walk itself is budgeted.
  test('should bound an acyclic wide DAG', () => {
    const leaf = Array.from({ length: 1500 }, (_, i) => i)
    const middle = new Array<unknown>(1500).fill(leaf)
    const root = new Array<unknown>(1500).fill(middle)

    const { result, elapsed } = timed(() => argsStringify(root))

    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(result).toContain('entries omitted')
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })
})

describe('argsStringify budgets', () => {
  test('should stop at the node budget with a visible marker', () => {
    const leaf = Array.from({ length: 100 }, (_, i) => i)
    const root = new Array<unknown>(100).fill(leaf)

    const budgeted = createArgsStringify({ objectNodes: 250 })(root)
    const unbudgeted = createArgsStringify({ objectNodes: 500000 })(root)

    expect(budgeted).toContain('[+97 entries omitted]')
    expect(budgeted).toContain('[+54 entries omitted]')
    expect(budgeted.length).toBeLessThan(1000)
    expect(unbudgeted.length).toBeGreaterThan(20000)
  })

  test('should mark a value the char budget could not reach', () => {
    const value: Record<string, number> = {}
    for (let i = 0; i < 40; i++) {
      value[`k${i}`] = i
    }

    const result = createArgsStringify({ argChars: 128, totalChars: 100000 })(value)

    expect(result).toContain('"k8":"[Budget exhausted]"')
    expect(result).toContain('[+31 entries omitted]')
  })

  test('should never read more of a container than the breadth cap allows', () => {
    const counter = { reads: 0 }
    const value = countingObject(5000, counter)

    const result = argsStringify(value)

    expect(counter.reads).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.objectBreadth)
    expect(result).toContain('[+4000 entries omitted]')
  })

  test('should bound deep nesting with a visible marker', () => {
    const root: Record<string, unknown> = {}
    let cursor = root
    for (let i = 0; i < 200000; i++) {
      const next: Record<string, unknown> = {}
      cursor.n = next
      cursor = next
    }

    const result = argsStringify(root)

    expect(result).toContain('[Depth limit reached]')
    expect(result.length).toBeLessThan(1000)
  })

  // Pins the boundary itself: objectDepth is the number of nested levels rendered, so `depth >`
  // in place of `depth >=` would let the second assertion render one level too many.
  test('should render exactly objectDepth nested levels', () => {
    const stringify = createArgsStringify({ objectDepth: 2 })

    expect(stringify({ n: { leaf: 1 } })).toEqual('{"n":{"leaf":1}}')
    expect(stringify({ n: { n: { leaf: 1 } } })).toEqual('{"n":{"n":"[Depth limit reached]"}}')
  })

  // The string is cut at whichever is smaller, stringChars or what is left of the argument budget.
  // Ignoring the second bound moves the cut 6 characters, which the sink then hides in most shapes.
  test('should cut a string at the remaining argument budget, not only at stringChars', () => {
    const stringify = createArgsStringify({ argChars: 40, totalChars: 1000, stringChars: 1000 })

    expect(stringify({ n: 1, s: 'a'.repeat(100) })).toEqual(`{"n":1,"s":"${'a'.repeat(11)}[truncated]`)
  })

  test('should keep a real property whose name collides with the omission marker key', () => {
    const stringify = createArgsStringify({ objectBreadth: 1 })

    expect(stringify({ '...': 'REAL', a: 1, b: 2 })).toEqual('{"...":"REAL","...#1":"[+2 entries omitted]"}')
  })

  test('should bound a 500000 key object with a visible marker', () => {
    const big: Record<string, number> = {}
    for (let i = 0; i < 500000; i++) {
      big[`k${i}`] = i
    }

    const { result, elapsed } = timed(() => argsStringify(big))

    expect(result).toContain('[+499000 entries omitted]')
    expect(result.length).toBeLessThan(50000)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should not fabricate null entries when bounding an array', () => {
    const result = argsStringify(Array.from({ length: 5000 }, (_, i) => i + 1))

    expect(result).not.toContain('null')
    expect(result).toContain('[+4000 entries omitted]')
  })

  test('should mark an undefined member instead of turning it into null', () => {
    expect(argsStringify([1, undefined, 3])).toEqual('[1,"[undefined]",3]')
    expect(argsStringify({ a: 1, b: undefined })).toEqual('{"a":1,"b":"[undefined]"}')
  })

  test('should walk only the breadth cap of a sparse array', () => {
    const { result, elapsed } = timed(() => argsStringify(new Array(1e8)))

    expect(result).toContain('[+99999000 entries omitted]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should mark the array entry at the breadth boundary', () => {
    const stringify = createArgsStringify({ objectBreadth: 4 })

    expect(stringify([1, 2, 3, 4, 5])).toEqual('[1,2,3,4,"[+1 entries omitted]"]')
  })

  test('should apply stringChars to a string inside a structure', () => {
    const stringify = createArgsStringify({ stringChars: 100 })
    const result = stringify({ s: 'y'.repeat(1000000) })

    expect(result).toEqual(`{"s":"${'y'.repeat(100)}[truncated]"}`)
    expect(result.length).toBeLessThan(200)
  })

  test('should keep every string of a wide object inside the argument budget', () => {
    const value: Record<string, string> = {}
    for (let i = 0; i < 60; i++) {
      value[`k${i}`] = 'z'.repeat(5 * 1024 * 1024)
    }

    const { result, elapsed } = timed(() => argsStringify(value))

    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(result).toContain('[truncated]')
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should truncate without splitting a surrogate pair, at either parity', () => {
    for (const prefix of ['a', 'ab']) {
      const result = argsStringify(`${prefix}${'\u{1F600}'.repeat(50000)}`)

      expect(result).toContain('[truncated]')
      expect(isWellFormed(result)).toBe(true)
      expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
      expect(result.length).toBeGreaterThan(ARGS_STRINGIFY_LIMITS.argChars - 3)
    }
  })

  test('should not throw on a huge number of huge arguments', () => {
    const args = Array(20000).fill('x'.repeat(40960)) as string[]

    let result = ''
    const { elapsed } = timed(() => {
      result = argsStringify(...args)
      return result
    })

    expect(result).toContain('[truncated]')
    expect(result).toContain('arguments omitted]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.totalChars)
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })

  test('should bound the total output across arguments', () => {
    const args = Array.from({ length: 200 }, () => ({ payload: 'y'.repeat(20000) }))
    const result = argsStringify(...args)

    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.totalChars)
    expect(result).toContain('[truncated]')
  })

  test('should budget a huge Error stack', () => {
    const error = new Error('huge stack')
    error.stack = 'x'.repeat(50 * 1024 * 1024)

    const { result, elapsed } = timed(() => argsStringify(error))

    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.argChars)
    expect(result).toContain('[truncated]')
    expect(elapsed).toBeLessThan(HANG_GUARD_MS)
  })
})

describe('argsStringify output caps and format', () => {
  test('should keep the primitive and object separators of the legacy format', () => {
    expect(argsStringify('ctx', { a: 1 }, 5)).toEqual('ctx\n{"a":1} 5')
  })

  test('should honour createArgsStringify overrides', () => {
    expect(createArgsStringify({ totalChars: 256, argChars: 24 })('z'.repeat(100))).toEqual(`${'z'.repeat(13)}[truncated]`)
    expect(createArgsStringify({ objectBreadth: 2 })({ a: 1, b: 2, c: 3 })).toEqual('{"a":1,"b":2,"...":"[+1 entries omitted]"}')
  })

  test('should treat argChars and totalChars as hard caps', () => {
    const stringify = createArgsStringify({ totalChars: 120, argChars: 40 })
    const result = stringify('a'.repeat(500), { b: 'b'.repeat(500) }, 'c'.repeat(500), 'd'.repeat(500))

    expect(result.length).toBeLessThanOrEqual(120)
    expect(createArgsStringify({ totalChars: 5 })('a'.repeat(500)).length).toBeLessThanOrEqual(5)
    expect(createArgsStringify({ totalChars: 0 })('a'.repeat(500))).toEqual('')
  })

  test('should expose the default limits as a frozen object', () => {
    expect(Object.isFrozen(ARGS_STRINGIFY_LIMITS)).toBe(true)
    expect(() => {
      ;(ARGS_STRINGIFY_LIMITS as IArgsStringifyLimits).totalChars = 1
    }).toThrow()
  })

  // Four arguments fill the total budget to within 11 characters, which is less than a separator
  // plus a truncation mark: the tail of the call is unrenderable and has to be counted, not dropped.
  test('should count the arguments a full budget left no room for', () => {
    const filler = 'y'.repeat(ARGS_STRINGIFY_LIMITS.argChars - TRUNCATION_MARK_LENGTH)
    const last = 'y'.repeat(ARGS_STRINGIFY_LIMITS.argChars - TRUNCATION_MARK_LENGTH - 13)
    const result = argsStringify(filler, filler, filler, last, { orderId: 12345 }, new Error('payment failed'))

    expect(result).toContain('[+2 arguments omitted]')
    expect(result.length).toBeLessThanOrEqual(ARGS_STRINGIFY_LIMITS.totalChars)
  })

  test('should count exactly the arguments it skipped', () => {
    expect(createArgsStringify({ totalChars: 60 })('a'.repeat(40), { b: 1 }, 'c')).toEqual('aaaaaa[truncated][truncated][+2 arguments omitted]')
    expect(createArgsStringify({ totalChars: 45 })('a'.repeat(40), { b: 'b'.repeat(40) })).toEqual('[truncated][+2 arguments omitted]')
  })

  test('should never drop an argument without counting it', () => {
    const probes = [/a{3}/, /b{3}/, /c{3}/, /"d":4/]
    const unmarked: number[] = []
    const miscounted: number[] = []
    const oversized: number[] = []

    // Below the width of a truncation mark nothing at all can be written, which an empty result
    // states honestly; from there up every lost argument is either marked or counted.
    for (let totalChars = TRUNCATION_MARK_LENGTH; totalChars <= 300; totalChars++) {
      const result = createArgsStringify({ totalChars })('a'.repeat(40), { b: 'b'.repeat(40) }, 'c'.repeat(40), { d: 4 })
      const omitted = /\[\+(\d+) arguments omitted]/.exec(result)
      const claimed = omitted ? Number(omitted[1]) : 0
      const present = probes.filter((probe) => probe.test(result)).length

      if (result.length > totalChars) oversized.push(totalChars)
      if (present < probes.length - claimed && !result.includes('[truncated]')) unmarked.push(totalChars)
      if (present > probes.length - claimed) miscounted.push(totalChars)
    }

    expect(oversized).toEqual([])
    expect(unmarked).toEqual([])
    expect(miscounted).toEqual([])
    expect(createArgsStringify({ totalChars: TRUNCATION_MARK_LENGTH - 1 })('a'.repeat(40), { b: 2 })).toEqual('')
  })

  // A cut lands wherever the budget runs out, and used to leave `[Budge` or `[tr` in the log.
  test('should never leave a marker half written', () => {
    const shapes: (() => unknown)[] = [
      (): unknown => ({ a: 'a'.repeat(50), b: { deep: 1 } }),
      (): unknown => Object.fromEntries(Array.from({ length: 40 }, (_, i) => [`k${i}`, i])),
      (): unknown => [1, 2, 3, 'x'.repeat(80)],
      (): unknown => new Map(Array.from({ length: 30 }, (_, i) => [`k${i}`, i])),
      (): unknown => Buffer.alloc(50, 3),
      (): unknown => Object.assign(new Error('boom'), { ctx: { deep: 'z'.repeat(60) } }),
    ]

    const broken: string[] = []
    const check = (result: string, budget: number): void => {
      if (PARTIAL_MARK.test(withoutMarks(result))) {
        broken.push(`${budget}: ${result.slice(-60)}`)
      }
    }

    for (const shape of shapes) {
      for (let budget = 1; budget <= 250; budget++) {
        check(createArgsStringify({ argChars: budget, totalChars: 4096 })(shape()), budget)
        check(createArgsStringify({ totalChars: budget })(shape(), 'tail', shape()), budget)
      }
    }

    expect(broken).toEqual([])
  })
})
