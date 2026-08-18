import { IArgsStringifyLimits } from '../argsStringify'

/**
 * Drops the keys a caller set to `undefined`, so that spreading the result leaves the value
 * underneath in place.
 *
 * `exactOptionalPropertyTypes` is off, so `{ totalChars: raw ? Number(raw) : undefined }` — the
 * ordinary way to build a config out of environment variables — type-checks against
 * `Partial<IArgsStringifyLimits>`. Spread unguarded, that `undefined` overwrites the default rather
 * than falling back to it, the serialiser's capacity arithmetic becomes `NaN`, and every line it
 * renders comes out empty: a Telegram alert that fires carrying nothing but its own timestamp.
 */
export function definedLimits(limits: Partial<IArgsStringifyLimits> = {}): Partial<IArgsStringifyLimits> {
  // `Object.entries` drops the optionality of a `Partial`, so without widening the value back the
  // filter below reads as dead code — which is the same blind spot the callers had.
  const entries = Object.entries(limits) as [string, number | undefined][]

  return Object.fromEntries(entries.filter(([, value]) => value !== undefined))
}
