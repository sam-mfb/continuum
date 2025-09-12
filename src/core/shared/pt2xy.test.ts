/**
 * Tests for pt2xy function
 * @see orig/Sources/Utils.c:84-93
 */

import { describe, it, expect } from 'vitest'
import { pt2xy } from './pt2xy'
import type { Point } from './pt2xy'

describe('pt2xy', () => {
  it('returns 0 when point is at exact coordinates', () => {
    const point: Point = { h: 100, v: 200 }
    expect(pt2xy(point, 100, 200)).toBe(0)
  })

  it('calculates squared distance for horizontal offset', () => {
    const point: Point = { h: 103, v: 200 }
    // dx = 103 - 100 = 3, dy = 200 - 200 = 0
    // distance^2 = 3^2 + 0^2 = 9
    expect(pt2xy(point, 100, 200)).toBe(9)
  })

  it('calculates squared distance for vertical offset', () => {
    const point: Point = { h: 100, v: 204 }
    // dx = 100 - 100 = 0, dy = 204 - 200 = 4
    // distance^2 = 0^2 + 4^2 = 16
    expect(pt2xy(point, 100, 200)).toBe(16)
  })

  it('calculates squared distance for diagonal offset', () => {
    const point: Point = { h: 103, v: 204 }
    // dx = 103 - 100 = 3, dy = 204 - 200 = 4
    // distance^2 = 3^2 + 4^2 = 9 + 16 = 25
    expect(pt2xy(point, 100, 200)).toBe(25)
  })

  it('handles negative offsets correctly', () => {
    const point: Point = { h: 97, v: 196 }
    // dx = 97 - 100 = -3, dy = 196 - 200 = -4
    // distance^2 = (-3)^2 + (-4)^2 = 9 + 16 = 25
    expect(pt2xy(point, 100, 200)).toBe(25)
  })

  it('handles large distances', () => {
    const point: Point = { h: 1000, v: 2000 }
    // dx = 1000 - 100 = 900, dy = 2000 - 200 = 1800
    // distance^2 = 900^2 + 1800^2 = 810000 + 3240000 = 4050000
    expect(pt2xy(point, 100, 200)).toBe(4050000)
  })

  it('handles negative coordinates', () => {
    const point: Point = { h: -50, v: -100 }
    // dx = -50 - (-60) = 10, dy = -100 - (-110) = 10
    // distance^2 = 10^2 + 10^2 = 100 + 100 = 200
    expect(pt2xy(point, -60, -110)).toBe(200)
  })

  it('returns squared distance (not square root)', () => {
    const point: Point = { h: 3, v: 4 }
    // This forms a 3-4-5 right triangle from origin
    // Squared distance should be 25, not 5
    expect(pt2xy(point, 0, 0)).toBe(25)
  })

  describe('edge cases', () => {
    it('handles zero coordinates', () => {
      const point: Point = { h: 0, v: 0 }
      expect(pt2xy(point, 0, 0)).toBe(0)
    })

    it('handles maximum safe integer distances', () => {
      const point: Point = { h: 10000, v: 10000 }
      // dx = 10000, dy = 10000
      // distance^2 = 10000^2 + 10000^2 = 200000000
      expect(pt2xy(point, 0, 0)).toBe(200000000)
    })

    it('maintains precision with fractional coordinates', () => {
      const point: Point = { h: 100.5, v: 200.5 }
      // dx = 100.5 - 100 = 0.5, dy = 200.5 - 200 = 0.5
      // distance^2 = 0.5^2 + 0.5^2 = 0.25 + 0.25 = 0.5
      expect(pt2xy(point, 100, 200)).toBe(0.5)
    })
  })

  describe('symmetry properties', () => {
    it('is symmetric in x and y', () => {
      const point1: Point = { h: 105, v: 200 }
      const point2: Point = { h: 100, v: 205 }
      // Both should give distance^2 = 25
      expect(pt2xy(point1, 100, 200)).toBe(25)
      expect(pt2xy(point2, 100, 200)).toBe(25)
    })

    it('gives same result regardless of which point is reference', () => {
      const point: Point = { h: 103, v: 204 }
      const distance1 = pt2xy(point, 100, 200)
      // Reverse: measuring from (100,200) to (103,204)
      const reversePoint: Point = { h: 100, v: 200 }
      const distance2 = pt2xy(reversePoint, 103, 204)
      expect(distance1).toBe(distance2)
    })
  })
})
