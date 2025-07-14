import { describe, it, expect } from 'vitest'
import type { WhiteRec } from '../types'
import {
  sortWhitesByX,
  mergeOverlappingWhites,
  addSentinelWhites
} from './initWhites'

describe('sortWhitesByX', () => {
  it('sorts whites by x-coordinate ascending', () => {
    const whites: WhiteRec[] = [
      { id: 'w3', x: 30, y: 10, hasj: false, ht: 6, data: [0xff] },
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] },
      { id: 'w2', x: 20, y: 10, hasj: false, ht: 6, data: [0xff] }
    ]

    const sorted = sortWhitesByX(whites)

    expect(sorted[0]?.id).toBe('w1')
    expect(sorted[1]?.id).toBe('w2')
    expect(sorted[2]?.id).toBe('w3')
  })

  it('sorts by y-coordinate when x values are equal', () => {
    const whites: WhiteRec[] = [
      { id: 'w3', x: 10, y: 30, hasj: false, ht: 6, data: [0xff] },
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] },
      { id: 'w2', x: 10, y: 20, hasj: false, ht: 6, data: [0xff] }
    ]

    const sorted = sortWhitesByX(whites)

    expect(sorted[0]?.id).toBe('w1')
    expect(sorted[1]?.id).toBe('w2')
    expect(sorted[2]?.id).toBe('w3')
  })

  it('maintains stable sort for identical positions', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] },
      { id: 'w2', x: 10, y: 10, hasj: false, ht: 6, data: [0xee] },
      { id: 'w3', x: 10, y: 10, hasj: false, ht: 6, data: [0xdd] }
    ]

    const sorted = sortWhitesByX(whites)

    // Should maintain original order for identical positions
    expect(sorted[0]?.id).toBe('w1')
    expect(sorted[1]?.id).toBe('w2')
    expect(sorted[2]?.id).toBe('w3')
  })

  it('handles empty array', () => {
    const whites: WhiteRec[] = []

    const sorted = sortWhitesByX(whites)

    expect(sorted).toEqual([])
  })

  it('handles single element array', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] }
    ]

    const sorted = sortWhitesByX(whites)

    expect(sorted).toEqual(whites)
  })

  it('preserves white piece data during sort', () => {
    const whites: WhiteRec[] = [
      { id: 'w2', x: 20, y: 10, hasj: true, ht: 8, data: [0xaa, 0xbb] },
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] }
    ]

    const sorted = sortWhitesByX(whites)

    expect(sorted[0]).toEqual({
      id: 'w1',
      x: 10,
      y: 10,
      hasj: false,
      ht: 6,
      data: [0xff]
    })
    expect(sorted[1]).toEqual({
      id: 'w2',
      x: 20,
      y: 10,
      hasj: true,
      ht: 8,
      data: [0xaa, 0xbb]
    })
  })
})

describe('mergeOverlappingWhites', () => {
  it('merges whites at identical x,y positions with height 6', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0b11110000] },
      { id: 'w2', x: 10, y: 10, hasj: false, ht: 6, data: [0b11001100] }
    ]

    const merged = mergeOverlappingWhites(whites)

    expect(merged.length).toBe(1)
    expect(merged[0]?.x).toBe(10)
    expect(merged[0]?.y).toBe(10)
    expect(merged[0]?.ht).toBe(6)
    expect(merged[0]?.data[0]).toBe(0b11000000) // AND operation
  })

  it('combines bit patterns using AND operation', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xff, 0xf0, 0x0f, 0xaa, 0x55, 0x33]
      },
      {
        id: 'w2',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xf0, 0x0f, 0xff, 0x55, 0xaa, 0xcc]
      }
    ]

    const merged = mergeOverlappingWhites(whites)

    expect(merged.length).toBe(1)
    // The data should be 12 bytes now (not 6)
    // Each original value is already a byte, so no conversion needed
    expect(merged[0]?.data).toEqual([
      0xff & 0xf0, // 0xf0
      0xf0 & 0x0f, // 0x00
      0x0f & 0xff, // 0x0f
      0xaa & 0x55, // 0x00
      0x55 & 0xaa, // 0x00
      0x33 & 0xcc, // 0x00
      0,
      0,
      0,
      0,
      0,
      0 // Remaining elements default to 0
    ])
  })

  it('preserves non-overlapping whites', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] },
      { id: 'w2', x: 20, y: 10, hasj: false, ht: 6, data: [0xee] },
      { id: 'w3', x: 10, y: 20, hasj: false, ht: 6, data: [0xdd] }
    ]

    const merged = mergeOverlappingWhites(whites)

    expect(merged.length).toBe(3)
    expect(merged.find(w => w.x === 10 && w.y === 10)).toBeTruthy()
    expect(merged.find(w => w.x === 20 && w.y === 10)).toBeTruthy()
    expect(merged.find(w => w.x === 10 && w.y === 20)).toBeTruthy()
  })

  it('handles whites with different heights at same position', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      },
      {
        id: 'w2',
        x: 10,
        y: 10,
        hasj: false,
        ht: 8,
        data: [0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee]
      }
    ]

    const merged = mergeOverlappingWhites(whites)

    // Should not merge whites with different heights
    expect(merged.length).toBe(2)
  })

  it('handles empty array', () => {
    const whites: WhiteRec[] = []

    const merged = mergeOverlappingWhites(whites)

    expect(merged).toEqual([])
  })

  it('handles consecutive overlapping whites', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0b11111111] },
      { id: 'w2', x: 10, y: 10, hasj: false, ht: 6, data: [0b11110000] },
      { id: 'w3', x: 10, y: 10, hasj: false, ht: 6, data: [0b11001100] }
    ]

    const merged = mergeOverlappingWhites(whites)

    expect(merged.length).toBe(1)
    expect(merged[0]?.data[0]).toBe(0b11000000) // 0xff & 0xf0 & 0xcc
  })

  it('removes merged whites from result', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] },
      { id: 'w2', x: 10, y: 10, hasj: false, ht: 6, data: [0xee] },
      { id: 'w3', x: 20, y: 20, hasj: false, ht: 6, data: [0xdd] }
    ]

    const merged = mergeOverlappingWhites(whites)

    expect(merged.length).toBe(2)
    // The merged white keeps the first ID (w1), w2 is removed
    expect(merged.some(w => w.id === 'w1')).toBe(true)
    expect(merged.some(w => w.id === 'w2')).toBe(false)
    expect(merged.some(w => w.id === 'w3')).toBe(true)
    // Verify the merged data
    const mergedWhite = merged.find(w => w.id === 'w1')
    expect(mergedWhite?.data[0]).toBe(0xff & 0xee)
  })
})

describe('addSentinelWhites', () => {
  it('adds exactly 18 sentinel values', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] }
    ]

    const result = addSentinelWhites(whites)

    expect(result.length).toBe(19) // 1 original + 18 sentinels
    const sentinels = result.slice(1)
    expect(sentinels.length).toBe(18)
    expect(sentinels.every(s => s.x === 20000)).toBe(true)
  })

  it('preserves original whites unchanged', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 10, y: 10, hasj: false, ht: 6, data: [0xff] },
      { id: 'w2', x: 20, y: 20, hasj: true, ht: 4, data: [0xee] }
    ]
    const originalCopy = JSON.parse(JSON.stringify(whites))

    const result = addSentinelWhites(whites)

    // Original array should not be mutated
    expect(whites).toEqual(originalCopy)
    // First two elements should match originals
    expect(result[0]).toEqual(whites[0])
    expect(result[1]).toEqual(whites[1])
  })

  it('sets correct properties for sentinel values', () => {
    const whites: WhiteRec[] = []

    const result = addSentinelWhites(whites)

    expect(result.length).toBe(18)
    result.forEach((sentinel, i) => {
      expect(sentinel).toEqual({
        id: `sentinel${i}`,
        x: 20000,
        y: 0,
        hasj: false,
        ht: 0,
        data: []
      })
    })
  })

  it('appends sentinels to the end of the array', () => {
    const whites: WhiteRec[] = [
      { id: 'w1', x: 100, y: 100, hasj: false, ht: 6, data: [0xff] },
      { id: 'w2', x: 200, y: 200, hasj: false, ht: 6, data: [0xee] },
      { id: 'w3', x: 300, y: 300, hasj: false, ht: 6, data: [0xdd] }
    ]

    const result = addSentinelWhites(whites)

    // First 3 should be originals
    expect(result.slice(0, 3).map(w => w.id)).toEqual(['w1', 'w2', 'w3'])
    // Last 18 should be sentinels
    expect(result.slice(3).every(w => w.x === 20000)).toBe(true)
    expect(result.slice(3).length).toBe(18)
  })

  it('handles empty input array', () => {
    const result = addSentinelWhites([])

    expect(result.length).toBe(18)
    expect(result.every(w => w.x === 20000 && w.y === 0)).toBe(true)
  })
})
