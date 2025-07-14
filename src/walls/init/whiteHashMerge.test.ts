import { describe, it, expect } from 'vitest'
import type { WhiteRec, JunctionRec } from '../types'
import { whiteHashMerge } from './whiteHashMerge'
import { hashFigure } from './whitePatterns'

describe('whiteHashMerge', () => {
  it('adds hash patterns to whites at junction positions', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    // Should modify the white at the junction
    expect(result[0]?.hasj).toBe(true)
    // Data should be XORed with hash pattern
    expect(result[0]?.data).not.toEqual([
      0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
    ])
  })

  it('finds whites at exact junction positions', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      },
      {
        id: 'w2',
        x: 20,
        y: 20,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    // Only w1 matches exactly (same x,y as junction)
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
          0b11111111, 0b11111111, 0b00000000, 0b00000000, 0b11110000,
          0b11110000, 0b00001111, 0b00001111, 0b10101010, 0b10101010,
          0b01010101, 0b01010101
        ]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    // Data should be XORed with hash pattern
    const modified = result[0]
    expect(modified?.data).not.toEqual(whites[0]?.data)
    // Verify the data has been modified (XORed)
    expect(modified?.hasj).toBe(true)
    // The XOR operation should produce different values
    expect(modified?.data.some((v, i) => v !== whites[0]?.data[i])).toBe(true)
  })

  it('preserves whites not at junctions', () => {
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      },
      {
        id: 'w2',
        x: 50,
        y: 50,
        hasj: false,
        ht: 6,
        data: [
          0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee, 0xee
        ]
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
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
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
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      },
      {
        id: 'w2',
        x: 20,
        y: 20,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
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
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      }, // too close to left edge (x <= 8)
      {
        id: 'w2',
        x: 510,
        y: 10,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      } // too close to right edge (x >= 504)
    ]
    const junctions: JunctionRec[] = [
      { x: 2, y: 10 },
      { x: 510, y: 10 }
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
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
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
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      }
    ]
    const junctions: JunctionRec[] = []

    const result = whiteHashMerge(whites, junctions)

    // Whites should be unchanged
    expect(result).toEqual(whites)
  })

  it('only uses a junction once when processing multiple whites', () => {
    // This test verifies the C code behavior where a junction is "consumed"
    // after being used, preventing it from hashing multiple whites.
    // Note: whites must not be close neighbors, or they'll be skipped
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 20,
        y: 20,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      },
      {
        id: 'w2',
        x: 20,
        y: 20 + 10, // Far enough away to not be a close neighbor
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      }
    ]
    // Only one junction at the first white's position
    const junctions: JunctionRec[] = [{ x: 20, y: 20 }]
    const originalJunctions = JSON.parse(JSON.stringify(junctions))

    const result = whiteHashMerge(whites, junctions)

    // Only the first white should have been hashed
    expect(result[0]?.hasj).toBe(true)
    expect(result[1]?.hasj).toBe(false)

    // The original junctions array should be untouched (immutability)
    expect(junctions).toEqual(originalJunctions)
  })

  it('skips whites at the same position due to close neighbor check', () => {
    // When two whites are at the exact same position, they are close neighbors
    // to each other, so neither gets hashed even if there's a junction there
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 20,
        y: 20,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      },
      {
        id: 'w2',
        x: 20,
        y: 20,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 20, y: 20 }]

    const result = whiteHashMerge(whites, junctions)

    // Neither white should be hashed because they're close neighbors
    expect(result[0]?.hasj).toBe(false)
    expect(result[1]?.hasj).toBe(false)
    expect(result).toEqual(whites)
  })

  it('skips whites that have close neighbors', () => {
    // The C code uses no_close_wh() to skip whites that have neighbors within 3 pixels
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 20,
        y: 20,
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      },
      {
        id: 'w2',
        x: 22, // Only 2 pixels away horizontally (within 3)
        y: 21, // And 1 pixel away vertically (within 3)
        hasj: false,
        ht: 6,
        data: [
          0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff
        ]
      }
    ]
    const junctions: JunctionRec[] = [
      { x: 20, y: 20 },
      { x: 22, y: 21 }
    ]

    const result = whiteHashMerge(whites, junctions)

    // Both whites should remain unchanged because they have close neighbors
    expect(result[0]?.hasj).toBe(false)
    expect(result[1]?.hasj).toBe(false)
    expect(result).toEqual(whites)
  })

  it('calculates hash pattern correctly using XOR operations', () => {
    // This test verifies the exact hash pattern calculation
    // Based on C code: (back & (~data | hashFigure)) ^ hashFigure
    const whites: WhiteRec[] = [
      {
        id: 'w1',
        x: 10,
        y: 10,
        hasj: false,
        ht: 6,
        data: [
          0xff,
          0xff, // 0xffff
          0x00,
          0x00, // 0x0000
          0xf0,
          0xf0, // 0xf0f0
          0x0f,
          0x0f, // 0x0f0f
          0xaa,
          0xaa, // 0xaaaa
          0x55,
          0x55 // 0x5555
        ]
      }
    ]
    const junctions: JunctionRec[] = [{ x: 10, y: 10 }]

    const result = whiteHashMerge(whites, junctions)

    // For position (10,10), (x+y) & 1 = 0, so we use backgr1 = 0xaaaaaaaa
    // Lower 16 bits of backgr1 = 0xaaaa

    // Let's manually calculate what each result should be:
    // Formula: (back & (~data | hashFigure)) ^ hashFigure
    const backgr1 = 0xaaaa // initial value
    const expectedData: number[] = []

    // First reconstruct 16-bit values from the input bytes
    const whiteData = whites[0]?.data ?? []
    const data16bit: number[] = []
    for (let i = 0; i < 6; i++) {
      const highByte = whiteData[i * 2] ?? 0
      const lowByte = whiteData[i * 2 + 1] ?? 0
      data16bit[i] = (highByte << 8) | lowByte
    }

    // Calculate expected values using 16-bit operations
    let rotatedBack = backgr1
    const expectedData16bit: number[] = []
    for (let i = 0; i < 6; i++) {
      const dataValue = data16bit[i] ?? 0
      const hashValue = hashFigure[i] ?? 0
      expectedData16bit[i] =
        (rotatedBack & (~dataValue | hashValue)) ^ hashValue
      // Rotate left by 1 bit
      rotatedBack = ((rotatedBack << 1) | (rotatedBack >>> 15)) & 0xffff
    }

    // Convert expected 16-bit values to bytes
    for (let i = 0; i < 6; i++) {
      const value = expectedData16bit[i] ?? 0
      expectedData.push((value >>> 8) & 0xff)
      expectedData.push(value & 0xff)
    }

    const modified = result[0]
    expect(modified?.hasj).toBe(true)
    expect(modified?.data).toEqual(expectedData)
  })
})
