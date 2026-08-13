import { randomUUID } from 'node:crypto'

/**
 * The single place this package generates a UUID — swap the body to change format or randomness
 * source everywhere at once.
 *
 * Node caches a block of entropy between `randomUUID()` calls. A caller producing key material
 * rather than an identifier should call `randomUUID({ disableEntropyCache: true })` directly.
 */
export const uuidV4 = (): string => randomUUID()
