import { describe, it, expect } from 'vitest'
import type { LineRec } from '../types'
import { LINE_KIND, LINE_TYPE, LINE_DIR, NEW_TYPE } from '../constants'
import {
  organizeWallsByKind,
  findFirstWhiteWalls,
  detectWallJunctions
} from './initWalls'

describe('organizeWallsByKind', () => {
  it('organizes walls into separate linked lists by kind', () => {
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
        type: LINE_TYPE.N,
        kind: LINE_KIND.BOUNCE,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w3',
        startx: 40,
        starty: 40,
        endx: 50,
        endy: 50,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const result = organizeWallsByKind(walls)

    expect(result.kindPointers[LINE_KIND.NORMAL]).toBe('w1')
    expect(result.kindPointers[LINE_KIND.BOUNCE]).toBe('w2')
    expect(result.organizedWalls['w1']?.nextId).toBe('w3')
    expect(result.organizedWalls['w3']?.nextId).toBe(null)
    expect(result.organizedWalls['w2']?.nextId).toBe(null)
  })

  it('creates correct kindPointers for each wall type', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.GHOST,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const result = organizeWallsByKind(walls)

    expect(result.kindPointers[LINE_KIND.GHOST]).toBe('w1')
    expect(result.kindPointers[LINE_KIND.NORMAL]).toBe(null)
    expect(result.kindPointers[LINE_KIND.BOUNCE]).toBe(null)
  })

  it('handles empty wall array', () => {
    const walls: LineRec[] = []

    const result = organizeWallsByKind(walls)

    expect(result.organizedWalls).toEqual({})
    expect(result.kindPointers[LINE_KIND.NORMAL]).toBe(null)
    expect(result.kindPointers[LINE_KIND.BOUNCE]).toBe(null)
    expect(result.kindPointers[LINE_KIND.GHOST]).toBe(null)
  })

  it('handles walls of only one kind', () => {
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
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const result = organizeWallsByKind(walls)

    expect(result.kindPointers[LINE_KIND.NORMAL]).toBe('w1')
    expect(result.kindPointers[LINE_KIND.BOUNCE]).toBe(null)
    expect(result.kindPointers[LINE_KIND.GHOST]).toBe(null)
    expect(result.organizedWalls['w1']?.nextId).toBe('w2')
    expect(result.organizedWalls['w2']?.nextId).toBe(null)
  })

  it('maintains linked list order within each kind', () => {
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
        type: LINE_TYPE.N,
        kind: LINE_KIND.BOUNCE,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w3',
        startx: 40,
        starty: 40,
        endx: 50,
        endy: 50,
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
        id: 'w4',
        startx: 60,
        starty: 60,
        endx: 70,
        endy: 70,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.BOUNCE,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const result = organizeWallsByKind(walls)

    // Normal walls: w1 -> w3
    expect(result.organizedWalls['w1']?.nextId).toBe('w3')
    expect(result.organizedWalls['w3']?.nextId).toBe(null)

    // Bouncing walls: w2 -> w4
    expect(result.organizedWalls['w2']?.nextId).toBe('w4')
    expect(result.organizedWalls['w4']?.nextId).toBe(null)
  })

  it('creates proper nextId chains for each kind', () => {
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
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w3',
        startx: 40,
        starty: 40,
        endx: 50,
        endy: 50,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const result = organizeWallsByKind(walls)

    // Follow the chain
    let currentId: string | null = result.kindPointers[LINE_KIND.NORMAL]
    const chain: string[] = []
    while (currentId) {
      chain.push(currentId)
      currentId = result.organizedWalls[currentId]?.nextId || null
    }

    expect(chain).toEqual(['w1', 'w2', 'w3'])
  })
})

describe('findFirstWhiteWalls', () => {
  it('identifies all NNE walls', () => {
    const originalWalls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
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
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w3',
        startx: 40,
        starty: 40,
        endx: 50,
        endy: 50,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: null,
        nextwhId: null
      }
    ]
    
    const originalWallsCopy = JSON.parse(JSON.stringify(originalWalls))
    const result = findFirstWhiteWalls(originalWalls)

    expect(result.firstWhiteId).toBe('w1')
    expect(result.updatedWalls['w1']?.nextwhId).toBe('w3')
    expect(result.updatedWalls['w3']?.nextwhId).toBe(null)
    
    // Verify the original array was not mutated
    expect(originalWalls).toEqual(originalWallsCopy)
  })

  it('creates linked list of NNE walls via nextwhId', () => {
    const originalWalls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
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
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: null,
        nextwhId: null
      }
    ]
    
    // Deep copy to check for mutations
    const originalWallsCopy = JSON.parse(JSON.stringify(originalWalls))

    const result = findFirstWhiteWalls(originalWalls)

    // Check the returned values
    expect(result.firstWhiteId).toBe('w1')
    expect(result.updatedWalls['w1']?.nextwhId).toBe('w2')
    expect(result.updatedWalls['w2']?.nextwhId).toBe(null)
    
    // Verify the original array was not mutated
    expect(originalWalls).toEqual(originalWallsCopy)
  })

  it('returns empty string when no NNE walls exist', () => {
    const originalWalls: LineRec[] = [
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
      }
    ]
    
    const originalWallsCopy = JSON.parse(JSON.stringify(originalWalls))
    const result = findFirstWhiteWalls(originalWalls)

    expect(result.firstWhiteId).toBe('')
    expect(Object.keys(result.updatedWalls).length).toBe(1) // Only w1, unchanged
    
    // Verify the original array was not mutated
    expect(originalWalls).toEqual(originalWallsCopy)
  })

  it('maintains order of NNE walls in linked list', () => {
    const originalWalls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
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
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w3',
        startx: 40,
        starty: 40,
        endx: 50,
        endy: 50,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: null,
        nextwhId: null
      }
    ]
    
    const originalWallsCopy = JSON.parse(JSON.stringify(originalWalls))
    const result = findFirstWhiteWalls(originalWalls)

    expect(result.firstWhiteId).toBe('w1')
    expect(result.updatedWalls['w1']?.nextwhId).toBe('w3')
    expect(result.updatedWalls['w3']?.nextwhId).toBe(null)
    
    // Verify the original array was not mutated
    expect(originalWalls).toEqual(originalWallsCopy)
  })

  it('handles mixed wall types correctly', () => {
    const originalWalls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 10,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.E,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.E,
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
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.BOUNCE,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w3',
        startx: 40,
        starty: 40,
        endx: 50,
        endy: 50,
        up_down: LINE_DIR.UP,
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.GHOST,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: null,
        nextwhId: null
      }
    ]
    
    const originalWallsCopy = JSON.parse(JSON.stringify(originalWalls))
    const result = findFirstWhiteWalls(originalWalls)

    expect(result.firstWhiteId).toBe('w2')
    expect(result.updatedWalls['w2']?.nextwhId).toBe('w3')
    expect(result.updatedWalls['w3']?.nextwhId).toBe(null)
    
    // Verify the original array was not mutated
    expect(originalWalls).toEqual(originalWallsCopy)
  })
})

describe('detectWallJunctions', () => {
  it('finds junctions where wall endpoints are within 3 pixels', () => {
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
        nextId: null,
        nextwhId: null
      }
    ]

    const junctions = detectWallJunctions(walls)

    // C code creates junctions for all endpoints, merging those within 3 pixels
    // (0,0), (10,10), and (20,20) are created; (11,11) is merged with (10,10)
    // Plus 18 sentinel values with x=20000 at the end
    expect(junctions.length).toBe(21) // 3 actual + 18 sentinels
    expect(junctions.slice(0, 3)).toContainEqual({ x: 0, y: 0 })
    expect(junctions.slice(0, 3)).toContainEqual({ x: 10, y: 10 })
    expect(junctions.slice(0, 3)).toContainEqual({ x: 20, y: 20 })
    // Check sentinel values
    for (let i = 3; i < 21; i++) {
      expect(junctions[i]).toEqual({ x: 20000, y: 0 })
    }
  })

  it('avoids duplicate junctions at same position', () => {
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
        nextId: null,
        nextwhId: null
      },
      {
        id: 'w3',
        startx: 10,
        starty: 10,
        endx: 30,
        endy: 30,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const junctions = detectWallJunctions(walls)

    // All three walls share (10,10) as a common point - should create one junction there
    // Plus the other endpoints: (0,0), (20,20), (30,30)
    // Plus 18 sentinel values with x=20000
    expect(junctions.length).toBe(22) // 4 actual + 18 sentinels
    expect(junctions.slice(0, 4)).toContainEqual({ x: 0, y: 0 })
    expect(junctions.slice(0, 4)).toContainEqual({ x: 10, y: 10 })
    expect(junctions.slice(0, 4)).toContainEqual({ x: 20, y: 20 })
    expect(junctions.slice(0, 4)).toContainEqual({ x: 30, y: 30 })
    // Check sentinel values
    for (let i = 4; i < 22; i++) {
      expect(junctions[i]).toEqual({ x: 20000, y: 0 })
    }
  })

  it('sorts junctions by x-coordinate', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 20,
        starty: 0,
        endx: 30,
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
        startx: 30,
        starty: 10,
        endx: 40,
        endy: 20,
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
        id: 'w3',
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
        id: 'w4',
        startx: 10,
        starty: 10,
        endx: 15,
        endy: 15,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const junctions = detectWallJunctions(walls)

    // Endpoints: (0,0), (10,10), (15,15), (20,0), (30,10), (40,20)
    // (30,10) appears twice but gets merged, (10,10) appears twice but gets merged
    // Plus 18 sentinel values with x=20000
    expect(junctions.length).toBe(24) // 6 actual + 18 sentinels
    // Should be sorted by x-coordinate
    expect(junctions[0]?.x).toBe(0)
    expect(junctions[1]?.x).toBe(10)
    expect(junctions[2]?.x).toBe(15)
    expect(junctions[3]?.x).toBe(20)
    expect(junctions[4]?.x).toBe(30)
    expect(junctions[5]?.x).toBe(40)
    // Check sentinel values
    for (let i = 6; i < 24; i++) {
      expect(junctions[i]).toEqual({ x: 20000, y: 0 })
    }
  })

  it('handles walls with identical endpoints', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 10,
        starty: 10,
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
        nextId: null,
        nextwhId: null
      }
    ]

    const junctions = detectWallJunctions(walls)

    // w1 has identical start/end at (10,10), w2 goes from (10,10) to (20,20)
    // All three (10,10) points merge into one junction
    // Plus 18 sentinel values with x=20000
    expect(junctions.length).toBe(20) // 2 actual + 18 sentinels
    expect(junctions.slice(0, 2)).toContainEqual({ x: 10, y: 10 })
    expect(junctions.slice(0, 2)).toContainEqual({ x: 20, y: 20 })
    // Check sentinel values
    for (let i = 2; i < 20; i++) {
      expect(junctions[i]).toEqual({ x: 20000, y: 0 })
    }
  })

  it('detects junctions at both start and end points of walls', () => {
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 50,
        endy: 50,
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
        startx: 1,
        starty: 1,
        endx: 20,
        endy: 20,
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
        id: 'w3',
        startx: 30,
        starty: 30,
        endx: 51,
        endy: 51,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const junctions = detectWallJunctions(walls)

    // Endpoints: (0,0), (50,50), (1,1), (20,20), (30,30), (51,51)
    // (1,1) merges with (0,0), (51,51) merges with (50,50)
    // Plus 18 sentinel values with x=20000
    expect(junctions.length).toBe(22) // 4 actual + 18 sentinels
    expect(junctions.slice(0, 4).some(j => j.x === 0 && j.y === 0)).toBe(true)
    expect(junctions.slice(0, 4).some(j => j.x === 50 && j.y === 50)).toBe(true)
    expect(junctions.slice(0, 4).some(j => j.x === 20 && j.y === 20)).toBe(true)
    expect(junctions.slice(0, 4).some(j => j.x === 30 && j.y === 30)).toBe(true)
    // Check sentinel values
    for (let i = 4; i < 22; i++) {
      expect(junctions[i]).toEqual({ x: 20000, y: 0 })
    }
  })

  it('handles empty wall array', () => {
    const walls: LineRec[] = []

    const junctions = detectWallJunctions(walls)

    // Even with no walls, C code adds 18 sentinel values
    expect(junctions.length).toBe(18)
    for (let i = 0; i < 18; i++) {
      expect(junctions[i]).toEqual({ x: 20000, y: 0 })
    }
  })

  it('handles walls with separate endpoints', () => {
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
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const junctions = detectWallJunctions(walls)

    // Each wall has two endpoints, none within 3 pixels of each other
    // Plus 18 sentinel values with x=20000
    expect(junctions.length).toBe(22) // 4 actual + 18 sentinels
    expect(junctions.slice(0, 4)).toContainEqual({ x: 0, y: 0 })
    expect(junctions.slice(0, 4)).toContainEqual({ x: 10, y: 10 })
    expect(junctions.slice(0, 4)).toContainEqual({ x: 20, y: 20 })
    expect(junctions.slice(0, 4)).toContainEqual({ x: 30, y: 30 })
    // Check sentinel values
    for (let i = 4; i < 22; i++) {
      expect(junctions[i]).toEqual({ x: 20000, y: 0 })
    }
  })

  it('ensures insertion sort maintains stability and correctness', () => {
    // Create a challenging test case with many junctions that need sorting
    const walls: LineRec[] = [
      {
        id: 'w1',
        startx: 100,
        starty: 0,
        endx: 200,
        endy: 0,
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
        startx: 50,
        starty: 0,
        endx: 150,
        endy: 0,
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
        id: 'w3',
        startx: 25,
        starty: 0,
        endx: 75,
        endy: 0,
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
        id: 'w4',
        startx: 300,
        starty: 0,
        endx: 10,
        endy: 0,
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
        id: 'w5',
        startx: 175,
        starty: 0,
        endx: 125,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: null,
        nextwhId: null
      }
    ]

    const junctions = detectWallJunctions(walls)

    // Expected junctions at x: 10, 25, 50, 75, 100, 125, 150, 175, 200, 300
    // Plus 18 sentinel values
    expect(junctions.length).toBe(28) // 10 actual + 18 sentinels
    
    // Verify proper sorting by x-coordinate
    const actualJunctions = junctions.slice(0, 10)
    expect(actualJunctions[0]?.x).toBe(10)
    expect(actualJunctions[1]?.x).toBe(25)
    expect(actualJunctions[2]?.x).toBe(50)
    expect(actualJunctions[3]?.x).toBe(75)
    expect(actualJunctions[4]?.x).toBe(100)
    expect(actualJunctions[5]?.x).toBe(125)
    expect(actualJunctions[6]?.x).toBe(150)
    expect(actualJunctions[7]?.x).toBe(175)
    expect(actualJunctions[8]?.x).toBe(200)
    expect(actualJunctions[9]?.x).toBe(300)
    
    // Verify the array is strictly sorted
    for (let i = 1; i < 10; i++) {
      expect(actualJunctions[i]!.x).toBeGreaterThan(actualJunctions[i-1]!.x)
    }
    
    // Check sentinel values
    for (let i = 10; i < 28; i++) {
      expect(junctions[i]).toEqual({ x: 20000, y: 0 })
    }
  })
})
