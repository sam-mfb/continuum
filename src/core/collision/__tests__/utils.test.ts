import { describe, it, expect } from 'vitest'
import { copy2dArray, deepFreeze } from '../utils'

describe('copy2dArray', () => {
  it('creates a new array instance', () => {
    const original = [
      [1, 2],
      [3, 4]
    ]
    const copy = copy2dArray(original)
    expect(copy).not.toBe(original)
  })

  it('creates new row array instances', () => {
    const original = [
      [1, 2],
      [3, 4]
    ]
    const copy = copy2dArray(original)
    expect(copy[0]).not.toBe(original[0])
    expect(copy[1]).not.toBe(original[1])
  })

  it('copies all values correctly', () => {
    const original = [
      [1, 2],
      [3, 4],
      [5, 6]
    ]
    const copy = copy2dArray(original)
    expect(copy).toEqual([
      [1, 2],
      [3, 4],
      [5, 6]
    ])
  })

  it('mutations to copy do not affect original', () => {
    const original = [
      [1, 2],
      [3, 4]
    ]
    const copy = copy2dArray(original)
    copy[0]![0] = 99
    expect(original[0]![0]).toBe(1)
    expect(copy[0]![0]).toBe(99)
  })

  it('handles empty arrays', () => {
    const original: number[][] = []
    const copy = copy2dArray(original)
    expect(copy).toEqual([])
    expect(copy).not.toBe(original)
  })

  it('handles arrays with empty rows', () => {
    const original = [[], [1, 2], []]
    const copy = copy2dArray(original)
    expect(copy).toEqual([[], [1, 2], []])
    expect(copy[1]).not.toBe(original[1])
  })

  it('works with string arrays', () => {
    const original = [
      ['a', 'b'],
      ['c', 'd']
    ]
    const copy = copy2dArray(original)
    expect(copy).toEqual([
      ['a', 'b'],
      ['c', 'd']
    ])
    expect(copy).not.toBe(original)
  })
})

describe('deepFreeze', () => {
  it('freezes the top-level array', () => {
    const arr = [
      [1, 2],
      [3, 4]
    ]
    deepFreeze(arr)
    expect(Object.isFrozen(arr)).toBe(true)
  })

  it('freezes nested arrays', () => {
    const arr = [
      [1, 2],
      [3, 4]
    ]
    deepFreeze(arr)
    expect(Object.isFrozen(arr[0])).toBe(true)
    expect(Object.isFrozen(arr[1])).toBe(true)
  })

  it('prevents modifications to top-level array', () => {
    const arr = [
      [1, 2],
      [3, 4]
    ]
    deepFreeze(arr)
    expect(() => {
      arr.push([5, 6])
    }).toThrow()
  })

  it('prevents modifications to nested arrays', () => {
    const arr = [
      [1, 2],
      [3, 4]
    ]
    deepFreeze(arr)
    expect(() => {
      arr[0]!.push(99)
    }).toThrow()
  })

  it('prevents reassignment of nested array elements', () => {
    const arr = [
      [1, 2],
      [3, 4]
    ]
    deepFreeze(arr)
    expect(() => {
      arr[0]![0] = 99
    }).toThrow()
  })

  it('returns the same object reference', () => {
    const arr = [
      [1, 2],
      [3, 4]
    ]
    const frozen = deepFreeze(arr)
    expect(frozen).toBe(arr)
  })

  it('handles empty arrays', () => {
    const arr: number[][] = []
    deepFreeze(arr)
    expect(Object.isFrozen(arr)).toBe(true)
  })

  it('handles deeply nested arrays', () => {
    const arr = [[[1, 2]], [[3, 4]]]
    deepFreeze(arr)
    expect(Object.isFrozen(arr)).toBe(true)
    expect(Object.isFrozen(arr[0])).toBe(true)
    expect(Object.isFrozen(arr[0]![0])).toBe(true)
  })
})
