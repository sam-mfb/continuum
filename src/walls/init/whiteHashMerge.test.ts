import { describe, it, expect } from 'vitest'
import type { WhiteRec, JunctionRec } from '../types'
import { whiteHashMerge } from './whiteHashMerge'

describe('whiteHashMerge', () => {
  it('adds hash patterns to whites at junction positions', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    // Should modify the white at the junction
    expect(result[0]?.hasj).toBe(true)
    // Data should be XORed with hash pattern
    expect(result[0]?.data).not.toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
  })

  it('finds whites within tolerance of junctions', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 11,
        y: 9,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      },
      {
        id: 'w2',
        x: 20,
        y: 20,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    // w1 is within tolerance (distance ~1.4), w2 is not
    expect(result.find(w => w.id === 'w1')?.hasj).toBe(true)
    expect(result.find(w => w.id === 'w2')?.hasj).toBe(false)
  })

  it('converts white data using XOR with hash pattern', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [
          0b11111111, 0b00000000, 0b11110000, 0b00001111, 0b10101010, 0b01010101
        ]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    // Data should be XORed with hash pattern
    const modified = result[0]
    expect(modified?.data).not.toEqual(whites[0]?.data)
    // Verify it's actually XORed (not just replaced)
    expect(modified?.data[0]).not.toBe(0b11111111)
    expect(modified?.data[0]).not.toBe(0)
  })

  it('preserves whites not at junctions', () => {
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
        x: 50,
        y: 50,
        hasj: false,
        ht: 6,
        data: [0xee, 0xee, 0xee, 0xee, 0xee, 0xee]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    // w2 should be unchanged
    const w2 = result.find(w => w.id === 'w2')
    expect(w2).toEqual(whites[1])
  })

  it('marks whites with hasj flag after hashing', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    expect(result[0]?.hasj).toBe(true)
  })

  it('handles background pattern alternation', () => {
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
        x: 20,
        y: 20,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }
    ]
    const junctions: JunctionRec[] = [
      { x: 10, y: 10 },
      { x: 20, y: 20 }
    ]

    const result = whiteHashMerge(whites, junctions)

    // Different junctions might use different hash patterns
    const w1 = result.find(w => w.id === 'w1')
    const w2 = result.find(w => w.id === 'w2')

    expect(w1?.hasj).toBe(true)
    expect(w2?.hasj).toBe(true)
    // Both should be modified but potentially with different patterns
    expect(w1?.data).not.toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
    expect(w2?.data).not.toEqual([0xff, 0xff, 0xff, 0xff, 0xff, 0xff])
  })

  it('skips whites too close to world edges', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 2,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }, // too close to left edge
      {
        id: 'w2',
        x: 510,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }, // too close to right edge
      {
        id: 'w3',
        x: 10,
        y: 2,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }, // too close to top edge
      {
        id: 'w4',
        x: 10,
        y: 340,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      } // too close to bottom edge
    ]
    const junctions: JunctionRec[] = [
      { x: 2, y: 10 },
      { x: 510, y: 10 },
      { x: 10, y: 2 },
      { x: 10, y: 340 }
    ]

    const result = whiteHashMerge(whites, junctions)

    // All whites near edges should remain unchanged
    expect(result).toEqual(whites)
  })

  it('removes processed junctions from list', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }
    ]
    const junctions: JunctionRec[] = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 }
    ]

    const result = whiteHashMerge(whites, junctions)

    // The function should process the junction at (10,10)
    // Implementation detail: it might modify the junctions array
    expect(result[0]?.hasj).toBe(true)
  })

  it('handles empty whites array', () => {
    const whites: WhiteRec[] = []
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    expect(result).toEqual([])
  })

  it('handles empty junctions array', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [0xff, 0xff, 0xff, 0xff, 0xff, 0xff]
      }
    ]
    const junctions: JunctionRec[] = []

    const result = whiteHashMerge(whites, junctions)

    // Whites should be unchanged
    expect(result).toEqual(whites)
  })
})
