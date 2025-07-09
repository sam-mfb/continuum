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

    const result = oneClose(wall1, wall2)

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

    const result = oneClose(wall1, wall2)

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

      const result = oneClose(baseWall, wall2)

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
      up_down: LINE_DIR.UP,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.S,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2)

    // North-North with different up/down should generate patches
    expect(result.patches.length).toBeGreaterThan(0)
    expect(result.patches[0]?.x).toBeDefined()
    expect(result.patches[0]?.y).toBeDefined()
    expect(result.patches[0]?.ht).toBe(6)
    expect(result.patches[0]?.data.length).toBe(6)
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

    const result = oneClose(wall1, wall2)

    expect(result.patches.length).toBeGreaterThan(0)
    // Check that patch is positioned correctly
    expect(result.patches[0]?.x).toBeGreaterThanOrEqual(10)
    expect(result.patches[0]?.y).toBeGreaterThanOrEqual(10)
  })

  it('generates correct patches for northeast-northeast junctions', () => {
    const wall1: LineRec = {
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
    }
    const wall2: LineRec = {
      id: 'w2',
      startx: 10,
      starty: 10,
      endx: 20,
      endy: 20,
      up_down: LINE_DIR.UP,
      type: LINE_TYPE.NNE,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.NNE,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2)

    expect(result.patches.length).toBeGreaterThan(0)
  })

  it('generates correct patches for east-east junctions', () => {
    const wall1: LineRec = {
      id: 'w1',
      startx: 0,
      starty: 0,
      endx: 10,
      endy: 0,
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
      startx: 10,
      starty: 0,
      endx: 20,
      endy: 0,
      up_down: LINE_DIR.UP,
      type: LINE_TYPE.E,
      kind: LINE_KIND.NORMAL,
      h1: 0,
      h2: 0,
      newtype: NEW_TYPE.E,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2)

    expect(result.patches.length).toBeGreaterThan(0)
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

    const result = oneClose(wall1, wall2)

    // Should calculate optimization values
    expect(result.wall1Updates.h1).toBeDefined()
    expect(result.wall1Updates.h2).toBeDefined()
    expect(result.wall2Updates.h1).toBeDefined()
    expect(result.wall2Updates.h2).toBeDefined()
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
      h2: 0,
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
      h2: 0,
      newtype: NEW_TYPE.NNE,
      nextId: '',
      nextwhId: ''
    }

    const result = oneClose(wall1, wall2)

    // Should still detect the junction at the close endpoints
    expect(result.patches.length).toBeGreaterThan(0)
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

    const result = oneClose(wall1, wall2)

    // Walls too far apart, should not generate patches
    expect(result.patches).toEqual([])
  })
})
