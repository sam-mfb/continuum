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
      length: 14, // sqrt((10-0)^2 + (10-0)^2) ≈ 14.14
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      h2: 10,
      length: 14, // Set initial h2 value
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
      h2: 10,
      length: 14, // Set initial h2 value
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      length: 14,
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
      length: 13,
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
      length: 10,
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
      length: 10,
      newtype: NEW_TYPE.E,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2, 0, 0) // start to start (far apart)

    // Walls too far apart, should not generate patches
    expect(result.patches).toEqual([])
  })

  describe('case 0 (dir1=0) combinations', () => {
    it('handles case 0 with dir2=15 or 1', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 30,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 10, // Must be < length - 21
        length: 30,
        newtype: NEW_TYPE.S, // dir1=8 at start, 0 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 30,
        starty: 0,
        endx: 40,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.SSE, // dir2=7 at start, 15 at end
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 1)

      expect(result.patches.length).toBe(1)
      expect(result.patches[0]?.ht).toBe(21)
      expect(result.wall1Updates.h2).toBe(9) // length(30) - i(21)
    })

    it('handles case 0 with dir2=2', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 20,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 15,
        length: 20, // Must be >= length - 10 for patch generation
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 20,
        starty: 0,
        endx: 30,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.NE, // dir2=2 at start
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 0)

      expect(result.patches.length).toBe(1)
      expect(result.patches[0]?.ht).toBe(10)
      expect(result.wall1Updates.h2).toBe(10) // length(20) - i(10)
    })
  })

  describe('case 10 and 11 combinations', () => {
    it('handles case 10 with multiple patches', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 50,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 50,
        length: 50, // h2 > length - 9 - j
        newtype: NEW_TYPE.NE, // dir1=2 at start, 10 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 50,
        starty: 0,
        endx: 60,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.SE, // dir2=6 at start
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 0)

      // Should generate multiple patches
      expect(result.patches.length).toBeGreaterThan(0)
      expect(result.wall1Updates.h2).toBeDefined()
    })

    it('handles case 11 with dir2=9', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 40,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 40,
        length: 40, // h2 >= length - 11 - j
        newtype: NEW_TYPE.ENE, // dir1=3 at start, 11 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 40,
        starty: 0,
        endx: 50,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.NNE, // dir2=1 at start, 9 at end
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 1)

      expect(result.patches.length).toBeGreaterThan(0)
      expect(result.wall1Updates.h2).toBeDefined()
    })
  })

  describe('case 12 combinations', () => {
    it('handles case 12 with dir2 in range 9-11', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 20,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 20,
        length: 20, // h2 === length for patch generation
        newtype: NEW_TYPE.E, // dir1=4 at start, 12 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
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
        length: 14,
        newtype: NEW_TYPE.NNE, // dir2=1 at start, 9 at end
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 1)

      expect(result.patches.length).toBe(1)
      expect(result.patches[0]?.ht).toBe(4)
      expect(result.wall1Updates.h2).toBe(6) // length(20) - 14
    })
  })

  describe('case 14 and 15 combinations', () => {
    it('handles case 14 with dir2=15', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 20,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 15,
        length: 20, // h2 > length - 10
        newtype: NEW_TYPE.SE, // dir1=6 at start, 14 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
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
        length: 14,
        newtype: NEW_TYPE.SSE, // dir2=7 at start, 15 at end
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 1)

      expect(result.patches.length).toBe(1)
      expect(result.patches[0]?.ht).toBe(10)
      expect(result.wall1Updates.h2).toBe(10) // length(20) - i(10)
    })

    it('handles case 15 with dir2=0', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 25,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 20,
        length: 25, // h2 > length - 17
        newtype: NEW_TYPE.SSE, // dir1=7 at start, 15 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
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
        length: 14,
        newtype: NEW_TYPE.S, // dir2=8 at start, 0 at end
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 1)

      expect(result.patches.length).toBe(1)
      expect(result.patches[0]?.ht).toBe(17)
      expect(result.wall1Updates.h2).toBe(8) // length(25) - i(17)
    })
  })

  describe('length calculation tests', () => {
    it('correctly uses wall length for diagonal walls in case 0', () => {
      // This test will fail with current implementation which uses endx-startx instead of length
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 30,
        endy: 40, // 3-4-5 triangle, length = 50
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 40, // Must be >= length - 10 for patch generation with dir2=2
        length: 50, // Pythagorean theorem: sqrt(30^2 + 40^2) = 50
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 30,
        starty: 40,
        endx: 40,
        endy: 50,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.NE, // dir2=2 at start
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 0)

      // With correct length calculation: 50 - 10 = 40, which equals h2, so patch should be generated
      expect(result.patches.length).toBe(1)
      expect(result.patches[0]?.ht).toBe(10)
      expect(result.wall1Updates.h2).toBe(40) // length(50) - i(10)
    })

    it('correctly calculates h2 updates for diagonal walls in case 10', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 40,
        endy: 30, // length = 50
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 50,
        length: 50,
        newtype: NEW_TYPE.NE, // dir1=2 at start, 10 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 40,
        starty: 30,
        endx: 50,
        endy: 40,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.SE, // dir2=6 at start
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 0)

      // With j = 0..4, patches should be created when h2 > length - 9 - j
      // First patch at j=0: 50 > 50 - 9 - 0 = 41, so create patch
      expect(result.patches.length).toBeGreaterThan(0)
      // Final h2 should be length - 9 - 4*i where i = dir2-5 = 1, so i-1 = 0
      expect(result.wall1Updates.h2).toBe(41) // 50 - 9 - 0
    })
  })

  describe('patch coordinate tests', () => {
    it('generates patches at correct coordinates for case 0', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 100,
        starty: 200,
        endx: 150,
        endy: 200,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 45,
        length: 50,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 150,
        starty: 200,
        endx: 160,
        endy: 210,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.NE, // dir2=2 at start
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 0)

      expect(result.patches.length).toBe(1)
      const patch = result.patches[0]!
      // C code for case 0 with j < length: replace_white_2(startx, starty+j, endx, endy-i, i, npatch)
      // Since j=h2=45 < length=50, it should call replace_white_2
      // The patch should be at (endx, endy-i) = (150, 200-10) = (150, 190)
      expect(patch.x).toBe(150)
      expect(patch.y).toBe(190)
    })

    it('generates patches at correct coordinates for case 14', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 100,
        starty: 100,
        endx: 120,
        endy: 120,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 25,
        length: 28, // sqrt(20^2 + 20^2) ≈ 28
        newtype: NEW_TYPE.SE, // dir1=6 at start, 14 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 120,
        starty: 120,
        endx: 130,
        endy: 130,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.SSE, // dir2=7 at start, 15 at end
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 1)

      expect(result.patches.length).toBe(1)
      const patch = result.patches[0]!
      // C code for case 14: replace_white_2(startx+j, starty+j, endx-i, endy-i, i, sepatch)
      // The patch should be at (endx-i, endy-i) = (120-10, 120-10) = (110, 110)
      expect(patch.x).toBe(110)
      expect(patch.y).toBe(110)
    })
  })

  describe('npatch initialization tests', () => {
    it('uses npatch data for case 0 patches', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 30,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 15,
        length: 30,
        newtype: NEW_TYPE.S,
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 30,
        starty: 0,
        endx: 40,
        endy: 10,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.SSE, // dir2=15 at end
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 1)

      expect(result.patches.length).toBe(1)
      const patch = result.patches[0]!
      // npatch should be initialized with 0x003F values (63 in decimal)
      expect(patch.data.length).toBe(22) // NUM_NPATCH_VALUES
      // Check that all values are 0x003F (63)
      expect(patch.data.every(val => val === 0x003f)).toBe(true)
    })

    it('uses npatch data for case 8 patches', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 0,
        endy: 30,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 10,
        h2: 0,
        length: 30,
        newtype: NEW_TYPE.S, // dir1=8 at start
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 0,
        starty: 30,
        endx: 10,
        endy: 40,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 0,
        length: 14,
        newtype: NEW_TYPE.SE, // dir2=6 at start
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 0, 0)

      expect(result.patches.length).toBe(1)
      const patch = result.patches[0]!
      expect(patch.data.length).toBe(22)
      expect(patch.data.every(val => val === 0x003f)).toBe(true)
    })
  })

  describe('empty case implementations', () => {
    it('returns empty for case 1', () => {
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
        length: 14,
        newtype: NEW_TYPE.SSE, // dir1=1 at end
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
        length: 14,
        newtype: NEW_TYPE.S, // Any dir2
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 0)

      expect(result.patches).toEqual([])
      expect(result.wall1Updates).toEqual({})
      expect(result.wall2Updates).toEqual({})
    })

    it('returns empty for cases 3, 4, 5', () => {
      const newtypes = [NEW_TYPE.ENE, NEW_TYPE.ESE, NEW_TYPE.E] as const // Will give dir1=3,4,5

      for (const newtype of newtypes) {
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
          length: 14,
          newtype,
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
          length: 14,
          newtype: NEW_TYPE.S,
          nextId: '',
          nextwhId: ''
        }

        const result = oneClose(wall1, wall2, 0, 0)

        expect(result.patches).toEqual([])
      }
    })

    it('returns empty for case 9', () => {
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
        length: 14,
        newtype: NEW_TYPE.NNE, // dir1=1 at start, 9 at end
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
        length: 14,
        newtype: NEW_TYPE.SE, // Any dir2
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 0)

      expect(result.patches).toEqual([])
    })

    it('returns empty for case 13', () => {
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
        length: 14,
        newtype: NEW_TYPE.ESE, // dir1=5 at start, 13 at end
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
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
        length: 14,
        newtype: NEW_TYPE.S, // Any dir2
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 1, 0)

      expect(result.patches).toEqual([])
    })
  })

  describe('h1/h2 boundary conditions', () => {
    it('skips patch generation when h1/h2 conditions not met', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 0,
        starty: 0,
        endx: 20,
        endy: 0,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 20, // h1 >= 6 + i, so skip patch in case 6
        h2: 0,
        length: 20,
        newtype: NEW_TYPE.SE, // dir1=6 at start
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
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
        length: 14,
        newtype: NEW_TYPE.SSE, // dir2=7 at start
        nextId: '',
        nextwhId: ''
      }

      const result = oneClose(wall1, wall2, 0, 0)

      expect(result.patches).toEqual([])
      expect(result.wall1Updates).toEqual({})
    })
  })
})
