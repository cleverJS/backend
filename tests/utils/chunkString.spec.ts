import { chunkString } from '../../core/utils/common'

const LIMIT = 4096
const EMOJI = '\u{1F600}'
const LONE_SURROGATE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/

/** `String.prototype.isWellFormed` is newer than the ES2022 lib this project compiles against. */
function isWellFormed(text: string): boolean {
  return !LONE_SURROGATE.test(text)
}

function reassemble(chunks: string[]): string {
  return chunks.join('')
}

function endsOnLoneSurrogate(chunk: string): boolean {
  const unit = chunk.charCodeAt(chunk.length - 1)

  return unit >= 0xd800 && unit <= 0xdbff
}

describe('chunkString', () => {
  test('should keep a surrogate pair whole across the Telegram chunk boundary', () => {
    const input = `${'a'.repeat(LIMIT - 1)}${EMOJI}${'b'.repeat(LIMIT - 1)}`
    const chunks = chunkString(input, LIMIT)

    // The pair starts at unit 4095, so a naive cut at 4096 lands between its halves and yields two
    // ill-formed chunks. Backing that cut up shortens the first chunk by one unit, which pushes one
    // trailing unit into a third chunk: the cost of the guarantee, paid only on inputs that would
    // otherwise have been split mid-pair.
    expect(input).toHaveLength(LIMIT * 2)
    expect(chunks).toHaveLength(3)
    expect(chunks[0]).toHaveLength(LIMIT - 1)
    for (const chunk of chunks) {
      expect(isWellFormed(chunk)).toBe(true)
      expect(endsOnLoneSurrogate(chunk)).toBe(false)
      expect(chunk.length).toBeLessThanOrEqual(LIMIT)
    }

    expect(reassemble(chunks)).toEqual(input)
  })

  test('should keep every pair whole wherever the boundary falls', () => {
    for (let lead = 0; lead < 8; lead++) {
      const input = `${'a'.repeat(LIMIT - lead)}${EMOJI.repeat(LIMIT)}`
      const chunks = chunkString(input, LIMIT)

      for (const chunk of chunks) {
        expect(isWellFormed(chunk)).toBe(true)
      }

      expect(reassemble(chunks)).toEqual(input)
    }
  })

  test('should not move a boundary that already falls between characters', () => {
    const input = 'a'.repeat(LIMIT * 3)
    const chunks = chunkString(input, LIMIT)

    expect(chunks.map((chunk) => chunk.length)).toEqual([LIMIT, LIMIT, LIMIT])
    expect(reassemble(chunks)).toEqual(input)
  })

  test('should keep the shape of the plain cases', () => {
    expect(chunkString('', 4)).toEqual([])
    expect(chunkString('abc', 4)).toEqual(['abc'])
    expect(chunkString('abcdefgh', 3)).toEqual(['abc', 'def', 'gh'])
    expect(chunkString('abcd', 4)).toEqual(['abcd'])
  })

  test('should split an astral character only when a chunk cannot hold a pair at all', () => {
    const chunks = chunkString(EMOJI, 1)

    expect(chunks).toHaveLength(2)
    expect(reassemble(chunks)).toEqual(EMOJI)
  })

  test('should reject a length that cannot make progress', () => {
    expect(() => chunkString('abc', 0)).toThrow(RangeError)
    expect(() => chunkString('abc', -1)).toThrow(RangeError)
  })

  test('should reassemble exactly for mixed content at many widths', () => {
    const input = `${EMOJI}ab${EMOJI}\u{1F1FA}\u{1F1F8}cd${EMOJI.repeat(5)}ef`

    for (let size = 2; size <= 12; size++) {
      const chunks = chunkString(input, size)

      for (const chunk of chunks) {
        expect(isWellFormed(chunk)).toBe(true)
        expect(chunk.length).toBeLessThanOrEqual(size)
        expect(chunk.length).toBeGreaterThan(0)
      }

      expect(reassemble(chunks)).toEqual(input)
    }
  })
})
