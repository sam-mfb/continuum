import { it, expect, describe } from 'vitest'
import { createBigEnd } from './bigEnd'

describe('getWord', () => {
  it('reads positive 16-bit integers in big-endian order', () => {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)

    // Set bytes for value 0x1234 (4660) in big-endian order
    view.setUint8(0, 0x12) // Most significant byte first
    view.setUint8(1, 0x34) // Least significant byte second

    const bigEnd = createBigEnd(buffer)
    expect(bigEnd.getWord(0)).toBe(0x1234)
  })

  it('reads negative 16-bit integers in big-endian order', () => {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)

    // Set bytes for value 0x8001 (-32767) in big-endian order
    view.setUint8(0, 0x80) // Most significant byte first
    view.setUint8(1, 0x01) // Least significant byte second

    const bigEnd = createBigEnd(buffer)
    expect(bigEnd.getWord(0)).toBe(-32767) // 0x8001 as signed 16-bit
  })

  it('reads words at different offsets', () => {
    const buffer = new ArrayBuffer(6)
    const view = new DataView(buffer)

    // First word: 0x1234 at offset 0
    view.setUint8(0, 0x12)
    view.setUint8(1, 0x34)

    // Second word: 0x5678 at offset 2
    view.setUint8(2, 0x56)
    view.setUint8(3, 0x78)

    // Third word: 0x9ABC at offset 4
    view.setUint8(4, 0x9a)
    view.setUint8(5, 0xbc)

    const bigEnd = createBigEnd(buffer)
    expect(bigEnd.getWord(0)).toBe(0x1234)
    expect(bigEnd.getWord(2)).toBe(0x5678)
    expect(bigEnd.getWord(4)).toBe(-25924) // 0x9ABC as signed 16-bit
  })

  it('handles maximum positive 16-bit value', () => {
    const buffer = new ArrayBuffer(2)
    const view = new DataView(buffer)

    // Set bytes for 32767 (0x7FFF) - max positive signed 16-bit
    view.setUint8(0, 0x7f)
    view.setUint8(1, 0xff)

    const bigEnd = createBigEnd(buffer)
    expect(bigEnd.getWord(0)).toBe(32767)
  })

  it('handles minimum negative 16-bit value', () => {
    const buffer = new ArrayBuffer(2)
    const view = new DataView(buffer)

    // Set bytes for -32768 (0x8000) - min negative signed 16-bit
    view.setUint8(0, 0x80)
    view.setUint8(1, 0x00)

    const bigEnd = createBigEnd(buffer)
    expect(bigEnd.getWord(0)).toBe(-32768)
  })

  it('handles zero value', () => {
    const buffer = new ArrayBuffer(2)
    // Buffer is initialized with zeros by default

    const bigEnd = createBigEnd(buffer)
    expect(bigEnd.getWord(0)).toBe(0)
  })

  it('verifies big-endian byte order', () => {
    const buffer = new ArrayBuffer(2)
    const view = new DataView(buffer)

    // Set bytes for 0x0102 - first byte is 0x01, second is 0x02
    view.setUint8(0, 0x01)
    view.setUint8(1, 0x02)

    const bigEnd = createBigEnd(buffer)
    // In big-endian, this should be 0x0102 = 258
    expect(bigEnd.getWord(0)).toBe(258)
  })

  it('throws when reading beyond buffer bounds', () => {
    const buffer = new ArrayBuffer(2)
    const bigEnd = createBigEnd(buffer)

    // Valid read
    expect(() => bigEnd.getWord(0)).not.toThrow()

    // Invalid reads beyond buffer bounds
    expect(() => bigEnd.getWord(1)).toThrow()
    expect(() => bigEnd.getWord(2)).toThrow()
    expect(() => bigEnd.getWord(-1)).toThrow()
  })

  it('maintains an immutable copy of the buffer', () => {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)

    const bigEnd = createBigEnd(buffer)

    // Fill original with test pattern AFTER creating BigEnd
    for (let i = 0; i < 8; i++) {
      view.setUint8(i, i + 1)
    }

    // BigEnd should still read zeros since it has an immutable copy
    expect(bigEnd.getWord(0)).toBe(0)
    expect(bigEnd.getWord(2)).toBe(0)
    expect(bigEnd.getWord(4)).toBe(0)
    expect(bigEnd.getWord(6)).toBe(0)
  })
})

describe('wordIterator', () => {
  it('iterates through words sequentially', () => {
    const buffer = new ArrayBuffer(6)
    const view = new DataView(buffer)

    // Set three words: 0x1234, 0x5678, 0x9ABC
    view.setUint8(0, 0x12)
    view.setUint8(1, 0x34)
    view.setUint8(2, 0x56)
    view.setUint8(3, 0x78)
    view.setUint8(4, 0x9a)
    view.setUint8(5, 0xbc)

    const bigEnd = createBigEnd(buffer)
    const iterator = bigEnd.wordIterator(0)

    expect(iterator.nextWord()).toBe(0x1234)
    expect(iterator.nextWord()).toBe(0x5678)
    expect(iterator.nextWord()).toBe(-25924) // 0x9ABC as signed 16-bit
  })

  it('starts iteration from specified offset', () => {
    const buffer = new ArrayBuffer(8)
    const view = new DataView(buffer)

    // Set four words
    view.setUint8(0, 0x11)
    view.setUint8(1, 0x11)
    view.setUint8(2, 0x22)
    view.setUint8(3, 0x22)
    view.setUint8(4, 0x33)
    view.setUint8(5, 0x33)
    view.setUint8(6, 0x44)
    view.setUint8(7, 0x44)

    const bigEnd = createBigEnd(buffer)
    const iterator = bigEnd.wordIterator(4)

    // Should skip first two words and start at offset 4
    expect(iterator.nextWord()).toBe(0x3333)
    expect(iterator.nextWord()).toBe(0x4444)
  })

  it('throws when attempting to iterate past buffer bounds', () => {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)

    view.setUint8(0, 0x12)
    view.setUint8(1, 0x34)
    view.setUint8(2, 0x56)
    view.setUint8(3, 0x78)

    const bigEnd = createBigEnd(buffer)
    const iterator = bigEnd.wordIterator(0)

    expect(iterator.nextWord()).toBe(0x1234)
    expect(iterator.nextWord()).toBe(0x5678)
    expect(() => iterator.nextWord()).toThrow('Attempted to iterate past buffer bounds')
  })

  it('handles empty iteration when starting at buffer end', () => {
    const buffer = new ArrayBuffer(4)
    const bigEnd = createBigEnd(buffer)
    const iterator = bigEnd.wordIterator(4)

    expect(() => iterator.nextWord()).toThrow('Attempted to iterate past buffer bounds')
  })

  it('handles single word at buffer end', () => {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)

    view.setUint8(2, 0xab)
    view.setUint8(3, 0xcd)

    const bigEnd = createBigEnd(buffer)
    const iterator = bigEnd.wordIterator(2)

    expect(iterator.nextWord()).toBe(-21555) // 0xABCD as signed 16-bit
    expect(() => iterator.nextWord()).toThrow('Attempted to iterate past buffer bounds')
  })

  it('maintains independent iterators', () => {
    const buffer = new ArrayBuffer(6)
    const view = new DataView(buffer)

    view.setUint8(0, 0x11)
    view.setUint8(1, 0x11)
    view.setUint8(2, 0x22)
    view.setUint8(3, 0x22)
    view.setUint8(4, 0x33)
    view.setUint8(5, 0x33)

    const bigEnd = createBigEnd(buffer)
    const iterator1 = bigEnd.wordIterator(0)
    const iterator2 = bigEnd.wordIterator(2)

    // First iterator reads from start
    expect(iterator1.nextWord()).toBe(0x1111)
    
    // Second iterator reads from offset 2
    expect(iterator2.nextWord()).toBe(0x2222)
    
    // They maintain independent positions
    expect(iterator1.nextWord()).toBe(0x2222)
    expect(iterator2.nextWord()).toBe(0x3333)
  })

  it('works with iterator created from immutable buffer copy', () => {
    const buffer = new ArrayBuffer(4)
    const view = new DataView(buffer)

    const bigEnd = createBigEnd(buffer)
    const iterator = bigEnd.wordIterator(0)

    // Modify original buffer after creating BigEnd
    view.setUint8(0, 0xff)
    view.setUint8(1, 0xff)
    view.setUint8(2, 0xee)
    view.setUint8(3, 0xee)

    // Iterator should still read zeros from immutable copy
    expect(iterator.nextWord()).toBe(0)
    expect(iterator.nextWord()).toBe(0)
  })
})
