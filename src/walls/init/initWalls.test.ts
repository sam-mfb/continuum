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
        kind: LINE_KIND.BOUNCE,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = organizeWallsByKind(walls)

    expect(result.kindPointers[LINE_KIND.NORMAL]).toBe('w1')
    expect(result.kindPointers[LINE_KIND.BOUNCE]).toBe('w2')
    expect(result.organizedWalls['w1']?.nextId).toBe('w3')
    expect(result.organizedWalls['w3']?.nextId).toBe('')
    expect(result.organizedWalls['w2']?.nextId).toBe('')
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
        nextId: '',
        nextwhId: ''
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

    const result = organizeWallsByKind(walls)

    expect(result.kindPointers[LINE_KIND.NORMAL]).toBe('w1')
    expect(result.kindPointers[LINE_KIND.BOUNCE]).toBe(null)
    expect(result.kindPointers[LINE_KIND.GHOST]).toBe(null)
    expect(result.organizedWalls['w1']?.nextId).toBe('w2')
    expect(result.organizedWalls['w2']?.nextId).toBe('')
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
        kind: LINE_KIND.BOUNCE,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = organizeWallsByKind(walls)

    // Normal walls: w1 -> w3
    expect(result.organizedWalls['w1']?.nextId).toBe('w3')
    expect(result.organizedWalls['w3']?.nextId).toBe('')

    // Bouncing walls: w2 -> w4
    expect(result.organizedWalls['w2']?.nextId).toBe('w4')
    expect(result.organizedWalls['w4']?.nextId).toBe('')
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const result = organizeWallsByKind(walls)

    // Follow the chain
    let currentId: string | null = result.kindPointers[LINE_KIND.NORMAL]
    const chain: string[] = []
    while (currentId) {
      chain.push(currentId)
      currentId = result.organizedWalls[currentId]?.nextId || ''
    }

    expect(chain).toEqual(['w1', 'w2', 'w3'])
  })
})

describe('findFirstWhiteWalls', () => {
  it('identifies all NNE walls', () => {
    const walls: LineRec[] = [
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const firstWhiteId = findFirstWhiteWalls(walls)

    expect(firstWhiteId).toBe('w1')
  })

  it('creates linked list of NNE walls via nextwhId', () => {
    const walls: LineRec[] = [
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
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: '',
        nextwhId: ''
      }
    ]

    findFirstWhiteWalls(walls)

    expect(walls[0]?.nextwhId).toBe('w2')
    expect(walls[1]?.nextwhId).toBe('')
  })

  it('returns empty string when no NNE walls exist', () => {
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

    const firstWhiteId = findFirstWhiteWalls(walls)

    expect(firstWhiteId).toBe('')
  })

  it('maintains order of NNE walls in linked list', () => {
    const walls: LineRec[] = [
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
        nextId: '',
        nextwhId: ''
      }
    ]

    findFirstWhiteWalls(walls)

    expect(walls[0]?.nextwhId).toBe('w3')
    expect(walls[2]?.nextwhId).toBe('')
  })

  it('handles mixed wall types correctly', () => {
    const walls: LineRec[] = [
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
        type: LINE_TYPE.NNE,
        kind: LINE_KIND.BOUNCE,
        h1: 0,
        h2: 0,
        newtype: NEW_TYPE.NNE,
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const firstWhiteId = findFirstWhiteWalls(walls)

    expect(firstWhiteId).toBe('w2')
    expect(walls[1]?.nextwhId).toBe('w3')
    expect(walls[2]?.nextwhId).toBe('')
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

    const junctions = detectWallJunctions(walls)

    // C code creates junctions for all endpoints, merging those within 3 pixels
    // (0,0), (10,10), and (20,20) are created; (11,11) is merged with (10,10)
    expect(junctions.length).toBe(3)
    expect(junctions).toContainEqual({ x: 0, y: 0 })
    expect(junctions).toContainEqual({ x: 10, y: 10 })
    expect(junctions).toContainEqual({ x: 20, y: 20 })
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const junctions = detectWallJunctions(walls)

    // All three walls share (10,10) as a common point - should create one junction there
    // Plus the other endpoints: (0,0), (20,20), (30,30)
    expect(junctions.length).toBe(4)
    expect(junctions).toContainEqual({ x: 0, y: 0 })
    expect(junctions).toContainEqual({ x: 10, y: 10 })
    expect(junctions).toContainEqual({ x: 20, y: 20 })
    expect(junctions).toContainEqual({ x: 30, y: 30 })
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
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const junctions = detectWallJunctions(walls)

    // Endpoints: (0,0), (10,10), (15,15), (20,0), (30,10), (40,20)
    // (30,10) appears twice but gets merged, (10,10) appears twice but gets merged
    expect(junctions.length).toBe(6)
    // Should be sorted by x-coordinate
    expect(junctions[0]?.x).toBe(0)
    expect(junctions[1]?.x).toBe(10)
    expect(junctions[2]?.x).toBe(15)
    expect(junctions[3]?.x).toBe(20)
    expect(junctions[4]?.x).toBe(30)
    expect(junctions[5]?.x).toBe(40)
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

    const junctions = detectWallJunctions(walls)

    // w1 has identical start/end at (10,10), w2 goes from (10,10) to (20,20)
    // All three (10,10) points merge into one junction
    expect(junctions.length).toBe(2)
    expect(junctions).toContainEqual({ x: 10, y: 10 })
    expect(junctions).toContainEqual({ x: 20, y: 20 })
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
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
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
        nextId: '',
        nextwhId: ''
      }
    ]

    const junctions = detectWallJunctions(walls)

    // Endpoints: (0,0), (50,50), (1,1), (20,20), (30,30), (51,51)
    // (1,1) merges with (0,0), (51,51) merges with (50,50)
    expect(junctions.length).toBe(4)
    expect(junctions.some(j => j.x === 0 && j.y === 0)).toBe(true)
    expect(junctions.some(j => j.x === 50 && j.y === 50)).toBe(true)
    expect(junctions.some(j => j.x === 20 && j.y === 20)).toBe(true)
    expect(junctions.some(j => j.x === 30 && j.y === 30)).toBe(true)
  })

  it('handles empty wall array', () => {
    const walls: LineRec[] = []

    const junctions = detectWallJunctions(walls)

    expect(junctions).toEqual([])
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

    const junctions = detectWallJunctions(walls)

    // Each wall has two endpoints, none within 3 pixels of each other
    expect(junctions.length).toBe(4)
    expect(junctions).toContainEqual({ x: 0, y: 0 })
    expect(junctions).toContainEqual({ x: 10, y: 10 })
    expect(junctions).toContainEqual({ x: 20, y: 20 })
    expect(junctions).toContainEqual({ x: 30, y: 30 })
  })
})
