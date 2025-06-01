const WORD_LENGTH_BYTES = 2

/**
 * Processing of an ArrayBuffer where the bits are arranged in big endian
 * order.
 *
 * Assumptions:
 *  - Endianness: big
 *  - Word length: 2 bytes
 */
export type BigEnd = {
  /** return the word (2 byte number) at the given byte offset **/
  getWord: (offset: number) => number
  /**
   * returns a generator that starts at the given offset and yields
   * one word at a time
   */
  wordIterator: (offset: number) => { nextWord: () => number }
}

const buildGetWord =
  (dv: DataView) =>
  (offset: number): number =>
    dv.getInt16(offset, false)

const buildWordGenerator = (dv: DataView) => (offset: number) => {
  return function* (): Generator<number, void, unknown> {
    for (
      let i = offset;
      // subtract one because we have to be able to read two bytes
      i < dv.byteLength - 1;
      i += WORD_LENGTH_BYTES
    )
      yield buildGetWord(dv)(i)
  }
}

export function createBigEnd(buffer: ArrayBuffer): BigEnd {
  const copy = buffer.slice(0)
  const dataView = new DataView(copy)
  return {
    getWord: buildGetWord(dataView),
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    wordIterator: offset => {
      const generator = buildWordGenerator(dataView)(offset)()
      return {
        nextWord: (): number => {
          const result = generator.next()
          if (result.done) {
            throw new Error('Attempted to iterate past buffer bounds')
          }
          return result.value
        }
      }
    }
  }
}
