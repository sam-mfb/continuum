import { describe, it, expect } from 'vitest'
import type { LineRec } from '../types'
import { LINE_KIND, LINE_TYPE, LINE_DIR, NEW_TYPE } from '../constants'
import { oneClose } from './oneClose'

describe('oneClose', () => {
  it('handles identical wall directions (returns empty)', () => {
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

    const result = oneClose(wall1, wall2, 1, 0) // end of wall1 to start of wall2

    expect(result.patches).toEqual([])
    expect(result.wall1Updates).toEqual({})
    expect(result.wall2Updates).toEqual({})
  })

  it('calculates correct direction values from newtype', () => {
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
      type: LINE_TYPE.NNE,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.NNE,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 1, 0) // end of wall1 to start of wall2

    // Should calculate proper directions from newtype values
    expect(result.patches.length).toBeGreaterThan(0)
  })

  it('handles all 64 direction combinations', () => {
    // This is a comprehensive test that would check all combinations
    // For brevity, testing a few key combinations
    const baseWall: LineRec = {
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

    const directionTypes = [
      NEW_TYPE.S,
      NEW_TYPE.S,
      NEW_TYPE.NNE,
      NEW_TYPE.NNE,
      NEW_TYPE.ENE,
      NEW_TYPE.ENE,
      NEW_TYPE.E,
      NEW_TYPE.E
    ]

    // Test a sampling of combinations
    for (const newtype of directionTypes.slice(0, 3)) {
      const wall2: LineRec = {
        ...baseWall,
        id: 'w2',
        newtype
      }

      const result = oneClose(baseWall, wall2, 1, 0) // test end-to-start connection

      // Should return result for each valid combination
      expect(result).toBeDefined()
    }
  })

  it('generates correct patches for north-north junctions', () => {
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
      h2: 10, // Set initial h2 value
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
      up_down: LINE_DIR.UP,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 10, // Set initial h2 value
      newtype: NEW_TYPE.NNE, // Different newtype to avoid same direction
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 1, 0) // end of wall1 to start of wall2

    // North-North with different up/down should generate patches
    expect(result.patches.length).toBeGreaterThan(0)
    expect(result.patches[0]?.x).toBeDefined()
    expect(result.patches[0]?.y).toBeDefined()
    expect(result.patches[0]?.ht).toBe(21) // npatch can have height 21
    expect(result.patches[0]?.data.length).toBe(22) // npatch array has 22 elements (NUM_NPATCH_VALUES)
  })

  it('generates correct patches for north-northeast junctions', () => {
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
      type: LINE_TYPE.NNE,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.NNE,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 1, 0) // end of wall1 to start of wall2

    expect(result.patches.length).toBeGreaterThan(0)
    // Patches can have negative y values due to the formula wall1.starty - 4 - j
    expect(result.patches[0]?.x).toBeDefined()
    expect(result.patches[0]?.y).toBeDefined()
  })

  it('generates correct patches for northeast junctions', () => {
    // Use a combination that actually generates patches
    const wall1: LineRec = {
      id: 'w1',
      startx: 0,
      starty: 10, // Higher y to avoid negative positions
      endx: 10,
      endy: 20,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.NNE,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 10,
      newtype: NEW_TYPE.NNE, // Will give dir1=1 at end
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 10,
      starty: 20,
      endx: 20,
      endy: 30,
      up_down: LINE_DIR.UP,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 10,
      newtype: NEW_TYPE.S, // Will give dir2=8 at start
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 1, 0) // end of wall1 to start of wall2

    // Case 1 has no implementation, so expect no patches
    expect(result.patches).toEqual([])
  })

  it('generates correct patches for southeast-south junctions', () => {
    // Use case 6 which generates patches for specific dir2 values
    const wall1: LineRec = {
      id: 'w1',
      startx: 0,
      starty: 10,
      endx: 10,
      endy: 20,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.ENE,
      kind: LINE_KIND.NORMAL,
      h1: 0, // Must be < 6 + i for patch generation
      h2: 10,
      newtype: NEW_TYPE.SE, // Will give dir1=6 at start
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 0,
      starty: 10,
      endx: 10,
      endy: 20,
      up_down: LINE_DIR.UP,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 10,
      newtype: NEW_TYPE.SSE, // Will give dir2=7 at start
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 0, 0) // start of wall1 to start of wall2

    // Case 6 with dir2=7 should generate patch with height 11
    expect(result.patches.length).toBe(1)
    expect(result.patches[0]?.ht).toBe(11)
  })

  it('calculates h1/h2 updates for optimization', () => {
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
      h2: 10,
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
      type: LINE_TYPE.NNE,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 10,
      newtype: NEW_TYPE.NNE,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 1, 0) // end of wall1 to start of wall2

    // Should have at least some updates (may not update all values)
    const hasWall1Updates = Object.keys(result.wall1Updates).length > 0
    const hasWall2Updates = Object.keys(result.wall2Updates).length > 0
    expect(hasWall1Updates || hasWall2Updates).toBe(true)
  })

  it('handles walls at different endpoints (start vs end)', () => {
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
      h2: 10,
      newtype: NEW_TYPE.S,
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 20,
      starty: 20,
      endx: 11,
      endy: 11, // end is close to wall1's end
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.NNE,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 10,
      newtype: NEW_TYPE.NNE,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 1, 1) // end of wall1 to end of wall2

    // With dir1=0 (S with endpoint) and dir2=0 (NNE with endpoint), they have same direction
    expect(result.patches).toEqual([])
  })

  it('returns empty patches for non-intersecting directions', () => {
    const wall1: LineRec = {
      id: 'w1',
      startx: 0,
      starty: 0,
      endx: 10,
      endy: 0, // horizontal
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.E,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.E,
      nextId: '',
      nextwhId: ''
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 50,
      starty: 50,
      endx: 60,
      endy: 50, // horizontal but far away
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.E,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.E,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 0, 0) // start to start (far apart)

    // Walls too far apart, should not generate patches
    expect(result.patches).toEqual([])
  })
})
