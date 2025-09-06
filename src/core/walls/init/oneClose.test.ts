import { describe, it, expect } from 'vitest'
import type { LineRec, WhiteRec } from '../types'
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

    const result = oneClose(wall1, wall2, 1, 0, []) // end of wall1 to start of wall2

    expect(result.newWhites).toEqual([])
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

    const result = oneClose(wall1, wall2, 1, 0, []) // end of wall1 to start of wall2

    // Should calculate proper directions from newtype values
    expect(result.newWhites.length).toBeGreaterThan(0)
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

    const result = oneClose(wall1, wall2, 0, 0, []) // start of wall1 to start of wall2

    // Case 6 with dir2=7 should generate patch with height 11
    expect(result.newWhites.length).toBe(1)
    expect(result.newWhites[0]?.ht).toBe(11)
  })

  describe('replace_white logic', () => {
    it('should replace an existing white patch when h1 > 6 for case 6', () => {
      const wall1: LineRec = {
        id: 'w1',
        startx: 100,
        starty: 100,
        endx: 110,
        endy: 110,
        up_down: LINE_DIR.DN,
        type: LINE_TYPE.ENE,
        kind: LINE_KIND.NORMAL,
        h1: 7, // C code: (*(line->h1 > 6 ? replace_white : add_white))
        h2: 14,
        length: 14,
        newtype: NEW_TYPE.SE, // dir1=6 at start
        nextId: '',
        nextwhId: ''
      }
      const wall2: LineRec = {
        id: 'w2',
        startx: 100,
        starty: 100,
        endx: 110,
        endy: 120,
        up_down: LINE_DIR.UP,
        type: LINE_TYPE.N,
        kind: LINE_KIND.NORMAL,
        h1: 0,
        h2: 10,
        length: 14,
        newtype: NEW_TYPE.SSE, // dir2=7 at start
        nextId: '',
        nextwhId: ''
      }

      // This existing patch should be REPLACED, not added to.
      const initialWhites: WhiteRec[] = [
        {
          id: 'p1',
          x: 106, // wall1.startx + 6
          y: 106, // wall1.starty + 6
          ht: 5, // The original height, should be updated
          hasj: false,
          data: [1, 2, 3]
        }
      ]

      const result = oneClose(wall1, wall2, 0, 0, initialWhites)

      // The test should fail here. The current implementation will just add a new
      // patch, making the length 2. The correct implementation should replace
      // the existing patch, keeping the length at 1.
      expect(result.newWhites.length).toBe(1)

      const updatedWhite = result.newWhites[0]
      expect(updatedWhite?.id).toBe('p1') // Should be the same patch
      expect(updatedWhite?.ht).toBe(11) // Height should be updated by case 6
      expect(updatedWhite?.data.length).not.toBe(3) // Data should be replaced
    })
  })
})
