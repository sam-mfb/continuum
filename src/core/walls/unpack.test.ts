import { describe, test, expect } from 'vitest'
import { createWall, unpackWall } from './unpack'
import { LINE_KIND, NEW_TYPE, LINE_TYPE, LINE_DIR } from './types'

describe('wall unpacking', () => {
  test('createWall produces correct wall for South direction', () => {
    const wall = createWall(50, 30, 25, NEW_TYPE.S, LINE_KIND.NORMAL, 0)

    expect(wall).toEqual({
      id: 'line-0',
      startx: 50,
      starty: 30,
      length: 25,
      endx: 50,
      endy: 55,
      up_down: LINE_DIR.DN,
      type: LINE_TYPE.N,
      kind: LINE_KIND.NORMAL,
      newtype: NEW_TYPE.S,
      nextId: null,
      nextwhId: null
    })
  })

  test('createWall produces correct wall for NNE direction', () => {
    const wall = createWall(260, 108, 25, NEW_TYPE.NNE, LINE_KIND.NORMAL, 7)

    expect(wall).toEqual({
      id: 'line-7',
      startx: 260,
      starty: 108,
      length: 25,
      endx: 272,
      endy: 83,
      up_down: LINE_DIR.UP,
      type: LINE_TYPE.NNE,
      kind: LINE_KIND.NORMAL,
      newtype: NEW_TYPE.NNE,
      nextId: null,
      nextwhId: null
    })
  })

  test('unpackWall correctly unpacks wall data', () => {
    // Test unpacking a SSE wall
    const packed = {
      startx: 120,
      starty: 30,
      length: 25,
      ud_and_t: (LINE_DIR.DN << 8) | (LINE_KIND.NORMAL << 3) | LINE_TYPE.NNE
    }

    const wall = unpackWall(packed, 1)

    expect(wall.id).toBe('line-1')
    expect(wall.startx).toBe(120)
    expect(wall.starty).toBe(30)
    expect(wall.length).toBe(25)
    expect(wall.endx).toBe(132)
    expect(wall.endy).toBe(55)
    expect(wall.up_down).toBe(LINE_DIR.DN)
    expect(wall.type).toBe(LINE_TYPE.NNE)
    expect(wall.kind).toBe(LINE_KIND.NORMAL)
    expect(wall.newtype).toBe(NEW_TYPE.SSE)
  })

  test('NNE and ENE walls have odd lengths', () => {
    const nneWall = createWall(0, 0, 24, NEW_TYPE.NNE)
    expect(nneWall.length).toBe(25) // Should be forced to odd

    const eneWall = createWall(0, 0, 24, NEW_TYPE.ENE)
    expect(eneWall.length).toBe(25) // Should be forced to odd

    const neWall = createWall(0, 0, 24, NEW_TYPE.NE)
    expect(neWall.length).toBe(24) // Should remain even
  })
})
