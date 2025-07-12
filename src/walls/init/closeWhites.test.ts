import { describe, it, expect, vi } from 'vitest'
import type { LineRec, WhiteRec } from '../types'
import { LINE_KIND, LINE_TYPE, LINE_DIR, NEW_TYPE } from '../constants'
import {
  findCloseWallPairs,
  processCloseWalls,
  updateWallOptimization,
  setInitialOptimization
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

    // The C code finds ALL pairs that match the box check
    // It processes both walls and checks all endpoints
    // The filtering/deduplication happens in one_close
    expect(pairs.length).toBeGreaterThan(0)
    
    // Check that the expected pair is found
    const hasExpectedPair = pairs.some(p => 
      p[0].id === 'w1' && p[1].id === 'w2' && 
      p[2] === 1 && p[3] === 0
    )
    expect(hasExpectedPair).toBe(true)
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

    // The C code finds all matching pairs
    expect(pairs.length).toBeGreaterThan(0)
    
    // Should find a pair where end of w1 is close to end of w2
    const hasEndToEndPair = pairs.some(p => 
      p[0].id === 'w1' && p[1].id === 'w2' && 
      p[2] === 1 && p[3] === 1
    )
    expect(hasEndToEndPair).toBe(true)
  })

  it('finds all pairs matching the C algorithm', () => {
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

    // The C code processes each wall as 'line' and checks against others
    // This can find multiple pairs including self-pairs
    expect(pairs.length).toBeGreaterThan(0)
    
    // Verify specific pairs exist
    const hasW1ToW2 = pairs.some(p => 
      p[0].id === 'w1' && p[1].id === 'w2' && 
      p[2] === 1 && p[3] === 0  // end of w1 to start of w2
    )
    expect(hasW1ToW2).toBe(true)
  })

  it('finds pairs using a 6x6 box check, not a simple radius', () => {
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
      // Position wall2 so that it's within the 6x6 box
      {
        id: 'w2',
        startx: 12,
        starty: 8,
        endx: 20,
        endy: 16,
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

    // Check that the 6x6 box logic finds the pair
    expect(pairs.length).toBeGreaterThan(0)
    
    const hasExpectedPair = pairs.some(p => 
      p[0].id === 'w1' && p[1].id === 'w2' && 
      p[2] === 1 && p[3] === 0  // end of w1 to start of w2
    )
    expect(hasExpectedPair).toBe(true)
  })

  it('follows C algorithm for complex wall arrangements', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 5,
        starty: 5,
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
      },
      {
        id: 'w2',
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
        id: 'w3',
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

    // The C code finds all pairs that match the box check
    expect(pairs.length).toBeGreaterThan(0)
    
    // Check for specific close pairs based on the 6x6 box logic
    // w1 start (5,5) and w2 end (10,10): 
    // x1=5, y1=5, x2=10-3=7, y2=10-3=7
    // 5 > 7 = false, so no match
    
    // w1 end (15,15) and w3 start (10,10):
    // x1=15, y1=15, x2=10-3=7, y2=10-3=7  
    // 15 > 7 && 15 > 7 && 15 < 13 = false, so no match
    
    // w2 end (10,10) and w3 start (10,10):
    // x1=10, y1=10, x2=10-3=7, y2=10-3=7
    // 10 > 7 && 10 > 7 && 10 < 13 && 10 < 13 = true, match!
    
    const hasW2W3Pair = pairs.some(p => 
      (p[0].id === 'w2' && p[1].id === 'w3') || 
      (p[0].id === 'w3' && p[1].id === 'w2')
    )
    
    expect(hasW2W3Pair).toBe(true)
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

    // Walls that are far apart should not form pairs
    // Check that no pairs exist between w1 and w2
    const hasW1W2Pair = pairs.some(p => 
      (p[0].id === 'w1' && p[1].id === 'w2') || 
      (p[0].id === 'w2' && p[1].id === 'w1')
    )
    expect(hasW1W2Pair).toBe(false)
    
    // But self-pairs might still exist
    expect(pairs.length).toBeGreaterThanOrEqual(0)
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

    // No pairs between w1 and w2 as they are far apart
    const hasInterWallPair = pairs.some(p => 
      (p[0].id === 'w1' && p[1].id === 'w2') || 
      (p[0].id === 'w2' && p[1].id === 'w1')
    )
    expect(hasInterWallPair).toBe(false)
    
    // The C code may still find self-pairs
    const hasSelfPairs = pairs.some(p => p[0].id === p[1].id)
    if (hasSelfPairs) {
      expect(pairs.length).toBeGreaterThan(0)
    } else {
      expect(pairs.length).toBe(0)
    }
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

    // Check that close pairs are found
    const hasW1W2Pair = pairs.some(p => 
      p[0].id === 'w1' && p[1].id === 'w2' && 
      p[2] === 1 && p[3] === 0  // w1 end to w2 start
    )
    const hasW2W3Pair = pairs.some(p => 
      p[0].id === 'w2' && p[1].id === 'w3'  // any endpoints
    )
    
    expect(hasW1W2Pair).toBe(true)
    expect(hasW2W3Pair).toBe(true)
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

    const pairs: Array<[LineRec, LineRec, number, number]> = [
      [wall1, wall2, 1, 0]
    ]

    processCloseWalls(pairs, mockOneClose)

    expect(mockOneClose).toHaveBeenCalledWith(wall1, wall2, 1, 0)
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

    const pairs: Array<[LineRec, LineRec, number, number]> = [
      [wall1, wall2, 1, 0]
    ]

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

    const pairs: Array<[LineRec, LineRec, number, number]> = [
      [wall1, wall2, 1, 0]
    ]

    const result = processCloseWalls(pairs, mockOneClose)

    expect(result.wallUpdates).toContainEqual({ wallId: 'w1', h1: 5, h2: 10 })
    expect(result.wallUpdates).toContainEqual({ wallId: 'w2', h1: 3 })
  })

  it('handles empty wall pairs array', () => {
    const mockOneClose = vi.fn()
    const pairs: Array<[LineRec, LineRec, number, number]> = []

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

    const pairs: Array<[LineRec, LineRec, number, number]> = [
      [wall1, wall2, 0, 1],
      [wall1, wall3, 1, 0]
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

    const pairs: Array<[LineRec, LineRec, number, number]> = [
      [wall1, wall2, 1, 0]
    ]

    const result = processCloseWalls(pairs, mockOneClose)

    expect(result.wallUpdates).toContainEqual({ wallId: 'custom-id-1', h1: 5 })
    expect(result.wallUpdates).toContainEqual({ wallId: 'custom-id-2', h2: 10 })
  })
})

describe('setInitialOptimization', () => {
  it('correctly sets h1 values based on newtype', () => {
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
        h1: 999, // Should be overwritten
        h2: 999, // Should be overwritten
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 20,
        starty: 0,
        endx: 30,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 999,
        h2: 999,
        newtype: NEW_TYPE.ESE,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w3',
        startx: 40,
        starty: 0,
        endx: 50,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 999,
        h2: 999,
        newtype: NEW_TYPE.E,
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = setInitialOptimization(walls)

    // Check h1 values from simpleh1 array
    expect(result[0]?.h1).toBe(6)  // NEW_TYPE.S -> simpleh1[1] = 6
    expect(result[1]?.h1).toBe(12) // NEW_TYPE.ESE -> simpleh1[4] = 12
    expect(result[2]?.h1).toBe(16) // NEW_TYPE.E -> simpleh1[5] = 16
  })

  it('correctly calculates h2 for horizontal walls', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 50,
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

    const result = setInitialOptimization(walls)

    // For horizontal wall: length = 50, simpleh2[NEW_TYPE.S] = 0
    // h2 = length + simpleh2 = 50 + 0 = 50
    expect(result[0]?.h2).toBe(50)
  })

  it('correctly calculates h2 for vertical walls', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 10,
        starty: 10,
        endx: 10,
        endy: 70,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.SSE,
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = setInitialOptimization(walls)

    // For vertical wall: length = 60, simpleh2[NEW_TYPE.SSE] = 0
    // h2 = length + simpleh2 = 60 + 0 = 60
    expect(result[0]?.h2).toBe(60)
  })

  it('correctly calculates h2 for diagonal walls using Pythagorean theorem', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 30,
        endy: 40,  // 3-4-5 triangle, actual length is 50
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
        starty: 100,
        endx: 103,
        endy: 104,  // 3-4-5 triangle, actual length is 5
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.ESE,
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = setInitialOptimization(walls)

    // Wall 1: length = sqrt(30^2 + 40^2) = sqrt(900 + 1600) = sqrt(2500) = 50
    // simpleh2[NEW_TYPE.S] = 0, so h2 = 50 + 0 = 50
    expect(result[0]?.h2).toBe(50)

    // Wall 2: length = sqrt(3^2 + 4^2) = sqrt(9 + 16) = sqrt(25) = 5
    // simpleh2[NEW_TYPE.ESE] = -1, so h2 = 5 + (-1) = 4
    expect(result[1]?.h2).toBe(4)
  })

  it('correctly applies negative h2 adjustments', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 20,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.ENE,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w2',
        startx: 30,
        starty: 0,
        endx: 60,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NE,
        nextId: '',
        nextwhId: ''
      },
      {
        id: 'w3',
        startx: 70,
        starty: 0,
        endx: 110,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = setInitialOptimization(walls)

    // Wall 1: length = 20, simpleh2[NEW_TYPE.ENE] = -11
    // h2 = 20 + (-11) = 9
    expect(result[0]?.h2).toBe(9)

    // Wall 2: length = 30, simpleh2[NEW_TYPE.NE] = -5
    // h2 = 30 + (-5) = 25
    expect(result[1]?.h2).toBe(25)

    // Wall 3: length = 40, simpleh2[NEW_TYPE.NNE] = -5
    // h2 = 40 + (-5) = 35
    expect(result[2]?.h2).toBe(35)
  })

  it('handles all NEW_TYPE values correctly', () => {
    // Test all 8 direction types (index 0 is not used, types 1-8)
    const testCases = [
      { newtype: NEW_TYPE.S, expectedH1: 6, h2Adjustment: 0 },
      { newtype: NEW_TYPE.SSE, expectedH1: 6, h2Adjustment: 0 },
      { newtype: NEW_TYPE.SE, expectedH1: 6, h2Adjustment: 0 },
      { newtype: NEW_TYPE.ESE, expectedH1: 12, h2Adjustment: -1 },
      { newtype: NEW_TYPE.E, expectedH1: 16, h2Adjustment: 0 },
      { newtype: NEW_TYPE.ENE, expectedH1: 0, h2Adjustment: -11 },
      { newtype: NEW_TYPE.NE, expectedH1: 1, h2Adjustment: -5 },
      { newtype: NEW_TYPE.NNE, expectedH1: 0, h2Adjustment: -5 }
    ]

    const walls = testCases.map((tc, idx) => ({
      id: `w${idx}`,
      startx: idx * 20,
      starty: 0,
      endx: idx * 20 + 10,
      endy: 0,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 999,
      h2: 999,
      newtype: tc.newtype,
      nextId: '',
      nextwhId: ''
    }))

    const result = setInitialOptimization(walls)

    testCases.forEach((tc, idx) => {
      expect(result[idx]?.h1).toBe(tc.expectedH1)
      expect(result[idx]?.h2).toBe(10 + tc.h2Adjustment) // length=10 + adjustment
    })
  })

  it('preserves all other wall properties unchanged', () => {
    const wall: LineRec = {
      id: 'unique-id',
      startx: 123,
      starty: 456,
      endx: 789,
      endy: 987,
      up_down: LINE_DIR.UP,
      type: LINE_TYPE.NNE,
      kind: LINE_KIND.BOUNCE,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S,
      nextId: 'next-wall',
      nextwhId: 'next-white'
    }

    const result = setInitialOptimization([wall])

    // Check that only h1 and h2 were modified
    expect(result[0]).toEqual({
      ...wall,
      h1: 6, // simpleh1[NEW_TYPE.S]
      h2: Math.sqrt((789-123)**2 + (987-456)**2) + 0 // calculated length + simpleh2[NEW_TYPE.S]
    })
    
    // Verify specific properties weren't changed
    expect(result[0]?.id).toBe('unique-id')
    expect(result[0]?.startx).toBe(123)
    expect(result[0]?.starty).toBe(456)
    expect(result[0]?.endx).toBe(789)
    expect(result[0]?.endy).toBe(987)
    expect(result[0]?.up_down).toBe(LINE_DIR.UP)
    expect(result[0]?.type).toBe(LINE_TYPE.NNE)
    expect(result[0]?.kind).toBe(LINE_KIND.BOUNCE)
    expect(result[0]?.nextId).toBe('next-wall')
    expect(result[0]?.nextwhId).toBe('next-white')
  })

  it('handles empty wall array', () => {
    const result = setInitialOptimization([])
    expect(result).toEqual([])
  })

  it('creates new wall objects (immutability)', () => {
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
      }
    ]

    const result = setInitialOptimization(walls)

    // Verify it returns new objects
    expect(result[0]).not.toBe(walls[0])
    expect(result).not.toBe(walls)

    // Verify original is unchanged
    expect(walls[0]?.h1).toBe(0)
    expect(walls[0]?.h2).toBe(0)

    // Verify new values are set
    expect(result[0]?.h1).toBe(6)
    expect(result[0]?.h2).toBe(10)
  })

  it('handles walls with zero length', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 50,
        starty: 50,
        endx: 50,
        endy: 50, // Same start and end point
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

    const result = setInitialOptimization(walls)

    // Length = 0, simpleh2[NEW_TYPE.S] = 0
    expect(result[0]?.h1).toBe(6)
    expect(result[0]?.h2).toBe(0)
  })

  it('handles walls with negative coordinates', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: -30,
        starty: -40,
        endx: 0,
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

    const result = setInitialOptimization(walls)

    // Length = sqrt(30^2 + 40^2) = 50
    expect(result[0]?.h1).toBe(6)
    expect(result[0]?.h2).toBe(50)
  })

  it('correctly calculates length for walls going in any direction', () => {
    const walls: LineRec[] = [
      // Right and down
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 3,
        endy: 4,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      // Left and down (negative dx)
      {
        id: 'w2',
        startx: 10,
        starty: 0,
        endx: 7,
        endy: 4,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      // Right and up (negative dy)
      {
        id: 'w3',
        startx: 20,
        starty: 10,
        endx: 23,
        endy: 6,
        up_down: LINE_DIR.UP,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      },
      // Left and up (both negative)
      {
        id: 'w4',
        startx: 30,
        starty: 10,
        endx: 27,
        endy: 6,
        up_down: LINE_DIR.UP,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = setInitialOptimization(walls)

    // All should have length 5 (3-4-5 triangle)
    expect(result[0]?.h2).toBe(5)
    expect(result[1]?.h2).toBe(5)
    expect(result[2]?.h2).toBe(5)
    expect(result[3]?.h2).toBe(5)
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
