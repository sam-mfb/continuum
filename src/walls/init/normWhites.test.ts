import { describe, it, expect } from 'vitest'
import type { LineRec } from '../types'
import { normWhites } from './normWhites'
import { LINE_DIR, LINE_TYPE, LINE_KIND, NEW_TYPE } from '../constants'

describe('normWhites', () => {
  it('generates white pieces for wall endpoints', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 10,
        starty: 20,
        endx: 30,
        endy: 40,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.NE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NE,
        nextId: null,
        nextwhId: null
      }
    ]

    const whites = normWhites(walls)

    // Should have whites for start and end points plus one glitch piece
    // But no temporary sentinels
    expect(whites.every(w => w.id !== 'sentinel_temp')).toBe(true)
    
    // Check that we have the expected whites
    const startWhite = whites.find(w => w.x === 10 && w.y === 20)
    expect(startWhite).toBeDefined()
    expect(startWhite?.ht).toBe(6)
    
    const endWhite = whites.find(w => w.x === 30 && w.y === 40)
    expect(endWhite).toBeDefined()
    expect(endWhite?.ht).toBe(6)
    
    // NE walls get a glitch piece at endx-4, endy+2
    const glitchWhite = whites.find(w => w.x === 26 && w.y === 42)
    expect(glitchWhite).toBeDefined()
    expect(glitchWhite?.ht).toBe(4)
  })

  it('removes all temporary sentinels from final output', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w2',
        startx: 20,
        starty: 20,
        endx: 30,
        endy: 30,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.NE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NE,
        nextId: null,
        nextwhId: null
      }
    ]

    const whites = normWhites(walls)

    // Verify no temporary sentinels remain
    expect(whites.every(w => w.id !== 'sentinel_temp')).toBe(true)
    expect(whites.every(w => w.x !== 20000 || w.id.startsWith('sentinel'))).toBe(true)
  })

  it('handles ENE walls with two glitch pieces', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 100,
        starty: 100,
        endx: 200,
        endy: 200,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.ENE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.ENE,
        nextId: null,
        nextwhId: null
      }
    ]

    const whites = normWhites(walls)

    // ENE walls get: start white, end white, and two glitch pieces
    expect(whites.length).toBe(4)
    
    // First glitch at startx+16, starty
    const glitch1 = whites.find(w => w.x === 116 && w.y === 100)
    expect(glitch1).toBeDefined()
    expect(glitch1?.ht).toBe(3)
    
    // Second glitch at endx-10, endy+1
    const glitch2 = whites.find(w => w.x === 190 && w.y === 201)
    expect(glitch2).toBeDefined()
    expect(glitch2?.ht).toBe(5)
  })

  it('handles walls with no white patterns', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: 0 as any, // Use 0 which has [null, null] in whitepicts
        nextId: null,
        nextwhId: null
      }
    ]

    const whites = normWhites(walls)

    // Should return empty array when no patterns match
    expect(whites).toEqual([])
  })

  it('preserves data patterns from whitepicts', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 10,
        starty: 10,
        endx: 20,
        endy: 20,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.E,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.SSE,
        nextId: null,
        nextwhId: null
      }
    ]

    const whites = normWhites(walls)

    // Each white should have its own copy of the data array
    whites.forEach(white => {
      expect(white.data).toBeDefined()
      expect(Array.isArray(white.data)).toBe(true)
    })
  })

  it('handles empty walls array', () => {
    const whites = normWhites([])
    expect(whites).toEqual([])
  })

  it('generates unique IDs for each white', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.NE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NE,
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w2',
        startx: 20,
        starty: 20,
        endx: 30,
        endy: 30,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.ENE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.ENE,
        nextId: null,
        nextwhId: null
      }
    ]

    const whites = normWhites(walls)
    const ids = whites.map(w => w.id)
    
    // All IDs should be unique
    expect(new Set(ids).size).toBe(ids.length)
    
    // All IDs should follow the pattern w0, w1, w2, etc.
    ids.forEach((id) => {
      expect(id).toMatch(/^w\d+$/)
    })
  })
})