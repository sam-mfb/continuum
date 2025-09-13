import { describe, it, expect } from 'vitest'
import { getLife } from '../getLife'
import type { ShotRec } from '../types'
import type { LineRec } from '../../shared/types/line'
import {
  LINE_TYPE,
  LINE_KIND,
  LINE_DIR,
  NEW_TYPE
} from '../../shared/types/line'

// Helper to create a basic shot
function createShot(
  x8: number,
  y8: number,
  h: number,
  v: number,
  overrides: Partial<ShotRec> = {}
): ShotRec {
  return {
    x: x8 >> 3,
    y: y8 >> 3,
    x8,
    y8,
    h,
    v,
    lifecount: 100,
    strafedir: -1,
    btime: 0,
    hitlineId: '',
    justDied: false,
    origin: { x: 0, y: 0 },
    ...overrides
  }
}

// Helper to create a basic wall
function createWall(
  id: string,
  startx: number,
  starty: number,
  endx: number,
  endy: number,
  type: (typeof LINE_TYPE)[keyof typeof LINE_TYPE] = LINE_TYPE.N,
  kind: (typeof LINE_KIND)[keyof typeof LINE_KIND] = LINE_KIND.NORMAL
): LineRec {
  return {
    id,
    startx,
    starty,
    endx,
    endy,
    length: Math.max(Math.abs(endx - startx), Math.abs(endy - starty)),
    type,
    kind,
    up_down: LINE_DIR.DN,
    newtype: NEW_TYPE.E,
    nextId: null,
    nextwhId: null
  }
}

describe('getLife - Integer Division (C compatibility)', () => {
  it('should return integer framesToImpact for vertical walls', () => {
    // Shot at x=99, moving right with h=16 (2 pixels/frame)
    // Wall at x=100
    // Distance = (100 - 99) << 3 = 8
    // Life = 8 / 16 = 0.5 in JavaScript
    // Should be 0 in C (integer division)
    const shot = createShot(99 << 3, 100 << 3, 16, 0)
    const walls = [createWall('wall-1', 100, 50, 100, 150, LINE_TYPE.N)]
    const totallife = 50

    const result = getLife(shot, walls, totallife)

    // This will FAIL with current implementation - returns 0.5
    // In C, integer division 8/16 = 0
    expect(Number.isInteger(result.framesToImpact)).toBe(true)
    expect(result.framesToImpact).toBe(0) // Should truncate to 0, not 0.5
  })

  it('should handle sub-frame collisions as 0 frames', () => {
    // Shot very close to wall - less than 1 frame away
    // Distance = 3 pixels in 8x fixed point = 24
    // Velocity = 36 (4.5 pixels per frame)
    // Life = 24 / 36 = 0.666... in JavaScript
    // Should be 0 in C
    const shot = createShot(97 << 3, 100 << 3, 36, 0)
    const walls = [createWall('wall-1', 100, 50, 100, 150, LINE_TYPE.N)]
    const totallife = 50

    const result = getLife(shot, walls, totallife)

    expect(Number.isInteger(result.framesToImpact)).toBe(true)
    expect(result.framesToImpact).toBe(0)
  })

  it('should truncate fractional frames for diagonal walls', () => {
    // Create scenario where diagonal collision math produces fraction
    const shot = createShot(98 << 3, 98 << 3, 17, 17) // Odd velocity for fractions
    const walls = [
      createWall('wall-1', 100, 100, 110, 110, LINE_TYPE.NE) // NE diagonal
    ]
    const totallife = 50

    const result = getLife(shot, walls, totallife)

    // Any collision calculation should return integer frames
    expect(Number.isInteger(result.framesToImpact)).toBe(true)
  })

  it('reproduces the -0.777777 bug scenario', () => {
    // Set up exact scenario that produces fractional lifecount
    // Shot velocity h=18 (2.25 pixels/frame)
    // Distance to wall = 4 pixels (32 in 8x)
    // Life = 32 / 18 = 1.777... -> should be 1 in C
    const shot = createShot(96 << 3, 100 << 3, 18, 0)
    const walls = [createWall('wall-1', 100, 50, 100, 150, LINE_TYPE.N)]
    const totallife = 50

    const result = getLife(shot, walls, totallife)

    // With integer division: floor(32/18) = 1
    // Current JS: 32/18 = 1.777...
    expect(Number.isInteger(result.framesToImpact)).toBe(true)
    expect(result.framesToImpact).toBe(1) // Should be 1, not 1.777...
  })

  it('should handle very small distances as 0 frames', () => {
    // Shot essentially touching the wall
    // Distance = 1 pixel = 8 in 8x
    // Velocity = 36
    // Life = 8 / 36 = 0.222... -> should be 0 in C
    const shot = createShot(99 << 3, 100 << 3, 36, 0)
    const walls = [createWall('wall-1', 100, 50, 100, 150, LINE_TYPE.N)]
    const totallife = 50

    const result = getLife(shot, walls, totallife)

    expect(Number.isInteger(result.framesToImpact)).toBe(true)
    expect(result.framesToImpact).toBe(0)

    // This is the case that leads to -0.777... after decrement
    // 0.222... - 1 = -0.777...
  })

  it('should handle diagonal wall vertical trajectory with integer division', () => {
    // Test the vertical shot path with diagonal wall
    // This uses: life = ((y0 - y) << 3) / shot.v
    const shot = createShot(105 << 3, 98 << 3, 0, 19) // Vertical, odd velocity
    const walls = [createWall('wall-1', 100, 100, 110, 110, LINE_TYPE.NE)]
    const totallife = 50

    const result = getLife(shot, walls, totallife)

    expect(Number.isInteger(result.framesToImpact)).toBe(true)
  })

  it('should handle diagonal wall general case with integer division', () => {
    // Test the general intersection case
    // This uses: life = (x0 - shot.x8) / shot.h
    const shot = createShot(90 << 3, 90 << 3, 23, 23) // Diagonal, odd velocity
    const walls = [createWall('wall-1', 100, 100, 120, 120, LINE_TYPE.NE)]
    const totallife = 50

    const result = getLife(shot, walls, totallife)

    expect(Number.isInteger(result.framesToImpact)).toBe(true)
  })

  it('matches C behavior for various edge cases', () => {
    // The C code computes: ((line.startx - sp->x) << 3) / sp->h
    // where sp->x = sp->x8 >> 3
    // This means sub-pixel positions are truncated before the distance calculation
    const testCases = [
      // When shot.x8 = 790, x = 98, distance = (100-98) << 3 = 16, life = 16/16 = 1
      { x8: 790, velocity: 16, expected: 1 }, // distance in pixels = 2, in 8x = 16
      // When shot.x8 = 784, x = 98, distance = (100-98) << 3 = 16, life = 16/16 = 1
      { x8: 784, velocity: 16, expected: 1 }, // Same pixel position
      // When shot.x8 = 792, x = 99, distance = (100-99) << 3 = 8, life = 8/16 = 0
      { x8: 792, velocity: 16, expected: 0 }, // Closer pixel position
      // When shot.x8 = 768, x = 96, distance = (100-96) << 3 = 32, life = 32/16 = 2
      { x8: 768, velocity: 16, expected: 2 }
    ]

    testCases.forEach(({ x8, velocity, expected }, index) => {
      const shot = createShot(x8, 100 << 3, velocity, 0)
      const walls = [createWall('wall-1', 100, 50, 100, 150, LINE_TYPE.N)]

      const result = getLife(shot, walls, 50)

      if (result.framesToImpact !== expected) {
        const x = x8 >> 3
        const distance = (100 - x) << 3
        console.log(
          `Test case ${index}: x8=${x8}, x=${x}, distance=${distance}, velocity=${velocity}, expected=${expected}, got=${result.framesToImpact}`
        )
      }
      expect(result.framesToImpact).toBe(expected)
    })
  })
})
