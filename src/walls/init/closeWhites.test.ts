import { describe, it, expect, vi } from 'vitest'
import type { LineRec, WhiteRec } from '../types'
import { LINE_KIND, LINE_TYPE, LINE_DIR, NEW_TYPE } from '../constants'
import {
  findCloseWallPairs,
  processCloseWalls,
  updateWallOptimization
} from './closeWhites'

describe('findCloseWallPairs', () => {
  it('finds wall pairs within 3 pixel threshold', () => {
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
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 11,
        starty: 11,
        endx: 20,
        endy: 20,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const pairs = findCloseWallPairs(walls)

    expect(pairs.length).toBe(1)
    expect(pairs[0]).toEqual([walls[0], walls[1]])
  })

  it('checks both endpoints of each wall', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 100,
        endy: 100,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 50,
        starty: 50,
        endx: 101,
        endy: 101,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const pairs = findCloseWallPairs(walls)

    expect(pairs.length).toBe(1)
    // Should find the pair because end of w1 is close to end of w2
  })

  it('avoids duplicate pairs', () => {
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
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 10,
        starty: 10,
        endx: 20,
        endy: 20,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const pairs = findCloseWallPairs(walls)

    expect(pairs.length).toBe(1)
    // Should only have one pair, not two (w1,w2) and (w2,w1)
  })

  it('optimizes by skipping walls too far apart in x', () => {
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
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 100,
        starty: 0,
        endx: 110,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const pairs = findCloseWallPairs(walls)

    expect(pairs.length).toBe(0)
  })

  it('handles empty wall array', () => {
    const walls: LineRec[] = []

    const pairs = findCloseWallPairs(walls)

    expect(pairs).toEqual([])
  })

  it('handles walls with no close neighbors', () => {
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
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 20,
        starty: 20,
        endx: 30,
        endy: 30,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const pairs = findCloseWallPairs(walls)

    expect(pairs).toEqual([])
  })

  it('correctly measures endpoint distances', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 12,
        starty: 0,
        endx: 20,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w3',
        startx: 14,
        starty: 0,
        endx: 24,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const pairs = findCloseWallPairs(walls)

    // w1 end (10,0) to w2 start (12,0) = distance 2 (within threshold)
    // w2 start (12,0) to w3 start (14,0) = distance 2 (within threshold)
    expect(pairs.length).toBe(2)
  })
})

describe('processCloseWalls', () => {
  it('calls oneClose for each wall pair', () => {
    const wall1: LineRec = {
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
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 10,
      starty: 10,
      endx: 20,
      endy: 20,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S,
      nextId: '',
      nextwhId: ''
    }

    const mockOneClose = vi.fn().mockReturnValue({
      patches: [],
      wall1Updates: {},
      wall2Updates: {}
    })

    const pairs: Array<[LineRec, LineRec]> = [[wall1, wall2]]

    processCloseWalls(pairs, mockOneClose)

    expect(mockOneClose).toHaveBeenCalledWith(wall1, wall2)
    expect(mockOneClose).toHaveBeenCalledTimes(1)
  })

  it('collects all patches from oneClose results', () => {
    const wall1: LineRec = {
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
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 10,
      starty: 10,
      endx: 20,
      endy: 20,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S,
      nextId: '',
      nextwhId: ''
    }

    const patch1: WhiteRec = {
      id: 'p1',
      x: 10,
      y: 10,
      hasj: false,
      ht: 6,
      data: [0xff]
    }
    const patch2: WhiteRec = {
      id: 'p2',
      x: 11,
      y: 11,
      hasj: false,
      ht: 6,
      data: [0xee]
    }

    const mockOneClose = vi.fn().mockReturnValue({
      patches: [patch1, patch2],
      wall1Updates: {},
      wall2Updates: {}
    })

    const pairs: Array<[LineRec, LineRec]> = [[wall1, wall2]]

    const result = processCloseWalls(pairs, mockOneClose)

    expect(result.patches).toEqual([patch1, patch2])
  })

  it('collects all wall h1/h2 updates', () => {
    const wall1: LineRec = {
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
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 10,
      starty: 10,
      endx: 20,
      endy: 20,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S,
      nextId: '',
      nextwhId: ''
    }

    const mockOneClose = vi.fn().mockReturnValue({
      patches: [],
      wall1Updates: { h1: 5, h2: 10 },
      wall2Updates: { h1: 3 }
    })

    const pairs: Array<[LineRec, LineRec]> = [[wall1, wall2]]

    const result = processCloseWalls(pairs, mockOneClose)

    expect(result.wallUpdates).toContainEqual({ wallId: 'w1', h1: 5, h2: 10 })
    expect(result.wallUpdates).toContainEqual({ wallId: 'w2', h1: 3 })
  })

  it('handles empty wall pairs array', () => {
    const mockOneClose = vi.fn()
    const pairs: Array<[LineRec, LineRec]> = []

    const result = processCloseWalls(pairs, mockOneClose)

    expect(mockOneClose).not.toHaveBeenCalled()
    expect(result.patches).toEqual([])
    expect(result.wallUpdates).toEqual([])
  })

  it('aggregates updates for same wall from multiple junctions', () => {
    const wall1: LineRec = {
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
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 10,
      starty: 10,
      endx: 20,
      endy: 20,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S,
      nextId: '',
      nextwhId: ''
    }
    const wall3: LineRec = {
      id: 'w3',
      startx: 9,
      starty: 9,
      endx: 15,
      endy: 15,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S,
      nextId: '',
      nextwhId: ''
    }

    let callCount = 0
    const mockOneClose = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call: w1-w2
        return {
          patches: [],
          wall1Updates: { h1: 5 },
          wall2Updates: { h2: 10 }
        }
      } else {
        // Second call: w1-w3
        return {
          patches: [],
          wall1Updates: { h2: 8 },
          wall2Updates: { h1: 3 }
        }
      }
    })

    const pairs: Array<[LineRec, LineRec]> = [
      [wall1, wall2],
      [wall1, wall3]
    ]

    const result = processCloseWalls(pairs, mockOneClose)

    // Should have aggregated updates for w1
    const w1Updates = result.wallUpdates.filter(u => u.wallId === 'w1')
    expect(w1Updates.length).toBe(2)
    expect(w1Updates).toContainEqual({ wallId: 'w1', h1: 5 })
    expect(w1Updates).toContainEqual({ wallId: 'w1', h2: 8 })
  })

  it('maintains wall ID references in updates', () => {
    const wall1: LineRec = {
      id: 'custom-id-1',
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
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'custom-id-2',
      startx: 10,
      starty: 10,
      endx: 20,
      endy: 20,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S,
      nextId: '',
      nextwhId: ''
    }

    const mockOneClose = vi.fn().mockReturnValue({
      patches: [],
      wall1Updates: { h1: 5 },
      wall2Updates: { h2: 10 }
    })

    const pairs: Array<[LineRec, LineRec]> = [[wall1, wall2]]

    const result = processCloseWalls(pairs, mockOneClose)

    expect(result.wallUpdates).toContainEqual({ wallId: 'custom-id-1', h1: 5 })
    expect(result.wallUpdates).toContainEqual({ wallId: 'custom-id-2', h2: 10 })
  })
})

describe('updateWallOptimization', () => {
  it('applies h1/h2 updates to correct walls by ID', () => {
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
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 10,
        starty: 10,
        endx: 20,
        endy: 20,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const updates = [
      { wallId: 'w1', h1: 5, h2: 10 },
      { wallId: 'w2', h2: 15 }
    ]

    const result = updateWallOptimization(walls, updates)

    expect(result[0]?.h1).toBe(5)
    expect(result[0]?.h2).toBe(10)
    expect(result[1]?.h1).toBe(0) // unchanged
    expect(result[1]?.h2).toBe(15)
  })

  it('preserves walls without updates', () => {
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
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 10,
        starty: 10,
        endx: 20,
        endy: 20,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const updates = [{ wallId: 'w1', h1: 5 }]

    const result = updateWallOptimization(walls, updates)

    expect(result[0]?.h1).toBe(5)
    expect(result[1]).toEqual(walls[1]) // unchanged
  })

  it('handles multiple updates to same wall', () => {
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const updates = [
      { wallId: 'w1', h1: 5 },
      { wallId: 'w1', h2: 10 },
      { wallId: 'w1', h1: 8 } // later update should override
    ]

    const result = updateWallOptimization(walls, updates)

    expect(result[0]?.h1).toBe(8) // last update wins
    expect(result[0]?.h2).toBe(10)
  })

  it('handles empty updates array', () => {
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const updates: Array<{ wallId: string; h1?: number; h2?: number }> = []

    const result = updateWallOptimization(walls, updates)

    expect(result).toEqual(walls)
  })

  it('creates new wall objects (immutability)', () => {
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const updates = [{ wallId: 'w1', h1: 5 }]

    const result = updateWallOptimization(walls, updates)

    expect(result[0]).not.toBe(walls[0]) // different object
    expect(result[0]?.h1).toBe(5)
    expect(walls[0]?.h1).toBe(0) // original unchanged
  })

  it('maintains all other wall properties', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 100,
        starty: 200,
        endx: 300,
        endy: 400,
        up_down: LINE_DIR.UP,
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.BOUNCE,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: 'w2',
        nextwhId: 'w3'
      }
    ]

    const updates = [{ wallId: 'w1', h1: 5, h2: 10 }]

    const result = updateWallOptimization(walls, updates)

    expect(result[0]).toEqual({
      ...walls[0],
      h1: 5,
      h2: 10
    })
  })
})
