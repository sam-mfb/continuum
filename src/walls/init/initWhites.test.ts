import { describe, it, expect } from 'vitest'
import type { WhiteRec } from '../types'
import { sortWhitesByX, mergeOverlappingWhites } from './initWhites'

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
    expect(merged[0]?.data).toEqual([
      0xff & 0xf0, // 0xf0
      0xf0 & 0x0f, // 0x00
      0x0f & 0xff, // 0x0f
      0xaa & 0x55, // 0x00
      0x55 & 0xaa, // 0x00
      0x33 & 0xcc // 0x00
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
    // Original w1 and w2 should not exist, only the merged one
    expect(merged.some(w => w.id === 'w1')).toBe(false)
    expect(merged.some(w => w.id === 'w2')).toBe(false)
    expect(merged.some(w => w.id === 'w3')).toBe(true)
  })
})
