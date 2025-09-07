/**
 * Tests for pt2line function
 * @see orig/Sources/Utils.c:106-151
 */

import { describe, it, expect } from 'vitest'
import { pt2line } from './pt2line'
import type { Point } from './pt2xy'
import type { LineRec } from './types/line'
import { LINE_TYPE, LINE_KIND, LINE_DIR, NEW_TYPE } from './types/line'

/**
 * Helper to create a line record for testing
 */
function createLine(partial: Partial<LineRec>): LineRec {
  return {
    id: 'test-line',
    startx: 100,
    starty: 100,
    endx: 200,
    endy: 100,
    length: 100,
    type: LINE_TYPE.E, // Horizontal by default
    kind: LINE_KIND.NORMAL,
    up_down: LINE_DIR.DN,
    newtype: NEW_TYPE.E,
    nextId: null,
    ...partial
  }
}

describe('pt2line', () => {
  describe('bounds checking', () => {
    it('returns 10000 for points far from line bounds', () => {
      const line = createLine({
        startx: 100,
        starty: 100,
        endx: 200,
        endy: 100
      })
      
      // Point far to the left
      const farLeft: Point = { h: 0, v: 100 }
      expect(pt2line(farLeft, line)).toBe(10000)
      
      // Point far to the right
      const farRight: Point = { h: 300, v: 100 }
      expect(pt2line(farRight, line)).toBe(10000)
      
      // Point far above
      const farAbove: Point = { h: 150, v: 0 }
      expect(pt2line(farAbove, line)).toBe(10000)
      
      // Point far below
      const farBelow: Point = { h: 150, v: 200 }
      expect(pt2line(farBelow, line)).toBe(10000)
    })

    it('processes points within 50 units of line bounds', () => {
      const line = createLine({
        startx: 100,
        starty: 100,
        endx: 200,
        endy: 100
      })
      
      // Just within bounds
      const nearPoint: Point = { h: 55, v: 100 }
      expect(pt2line(nearPoint, line)).not.toBe(10000)
    })
  })

  describe('vertical lines (LINE_N)', () => {
    const verticalLine = createLine({
      type: LINE_TYPE.N,
      startx: 100,
      starty: 100,
      endx: 100, // Same x
      endy: 200,
      length: 100
    })

    it('calculates distance to start point when above line', () => {
      const abovePoint: Point = { h: 103, v: 90 }
      // Should return distance to (100, 100) + 10
      // dx = 3, dy = -10, distance^2 = 9 + 100 = 109
      expect(pt2line(abovePoint, verticalLine)).toBe(109 + 10)
    })

    it('calculates distance to end point when below line', () => {
      const belowPoint: Point = { h: 103, v: 210 }
      // Should return distance to (100, 200) + 10
      // dx = 3, dy = 10, distance^2 = 9 + 100 = 109
      expect(pt2line(belowPoint, verticalLine)).toBe(109 + 10)
    })

    it('calculates horizontal distance when aligned with line', () => {
      const alignedPoint: Point = { h: 105, v: 150 }
      // Point is between start and end y, so just horizontal distance
      // dx = 5, distance^2 = 25
      expect(pt2line(alignedPoint, verticalLine)).toBe(25)
    })

    it('returns 0 for point on vertical line', () => {
      const onLine: Point = { h: 100, v: 150 }
      expect(pt2line(onLine, verticalLine)).toBe(0)
    })
  })

  describe('horizontal lines (LINE_E)', () => {
    const horizontalLine = createLine({
      type: LINE_TYPE.E,
      startx: 100,
      starty: 100,
      endx: 200,
      endy: 100, // Same y
      length: 100
    })

    it('calculates distance to start point when before line', () => {
      const beforePoint: Point = { h: 90, v: 103 }
      // Should return distance to (100, 100) + 10
      // dx = -10, dy = 3, distance^2 = 100 + 9 = 109
      expect(pt2line(beforePoint, horizontalLine)).toBe(109 + 10)
    })

    it('calculates distance to end point when after line', () => {
      const afterPoint: Point = { h: 210, v: 103 }
      // Should return distance to (200, 100) + 10
      // dx = 10, dy = 3, distance^2 = 100 + 9 = 109
      expect(pt2line(afterPoint, horizontalLine)).toBe(109 + 10)
    })

    it('calculates vertical distance when aligned with line', () => {
      const alignedPoint: Point = { h: 150, v: 105 }
      // Point projects onto line, perpendicular distance
      // dy = 5, distance^2 = 25
      expect(pt2line(alignedPoint, horizontalLine)).toBe(25)
    })

    it('returns 0 for point on horizontal line', () => {
      const onLine: Point = { h: 150, v: 100 }
      expect(pt2line(onLine, horizontalLine)).toBe(0)
    })
  })

  describe('diagonal lines', () => {
    describe('LINE_NE (45 degree)', () => {
      const neLine = createLine({
        type: LINE_TYPE.NE,
        startx: 100,
        starty: 100,
        endx: 200,
        endy: 150, // 45 degree-ish slope
        length: 100,
        up_down: LINE_DIR.DN
      })

      it('calculates distance using original algorithm', () => {
        // The original algorithm doesn't give true perpendicular distance
        // but uses a specific calculation with slopes2 table
        // For point (150,125) on line (100,100)-(200,150):
        // Following the exact calculation from Utils.c:
        // dx = -8.333..., dy = 16.666...
        // Result = dx^2 + dy^2 = 69.44... + 277.77... = 347.22...
        const testPoint: Point = { h: 150, v: 125 }
        expect(pt2line(testPoint, neLine)).toBeCloseTo(347.2222222222223, 10)
        
        // Start point should return exactly 0
        const startPoint: Point = { h: 100, v: 100 }
        expect(pt2line(startPoint, neLine)).toBe(0)
        
        // Point slightly off the line
        const offPoint: Point = { h: 150, v: 130 }
        expect(pt2line(offPoint, neLine)).toBeCloseTo(222.22222222222229, 10)
      })

      it('calculates distance to endpoints when projection outside segment', () => {
        const beforeStart: Point = { h: 50, v: 100 }
        // Should return distance to start point + 10
        expect(pt2line(beforeStart, neLine)).toBeGreaterThan(2500) // 50^2 = 2500 minimum
      })
    })

    describe('LINE_NNE (steep slope)', () => {
      const nneLine = createLine({
        type: LINE_TYPE.NNE,
        startx: 100,
        starty: 100,
        endx: 150,
        endy: 200, // Steep slope
        length: 100,
        up_down: LINE_DIR.DN
      })

      it('handles steep slopes correctly', () => {
        const testPoint: Point = { h: 125, v: 150 }
        const distance = pt2line(testPoint, nneLine)
        // Should return a valid distance, not 10000
        expect(distance).toBeLessThan(10000)
      })
    })

    describe('LINE_ENE (shallow slope)', () => {
      const eneLine = createLine({
        type: LINE_TYPE.ENE,
        startx: 100,
        starty: 100,
        endx: 200,
        endy: 125, // Shallow slope
        length: 100,
        up_down: LINE_DIR.DN
      })

      it('handles shallow slopes correctly', () => {
        const testPoint: Point = { h: 150, v: 110 }
        const distance = pt2line(testPoint, eneLine)
        // Should return a valid distance, not 10000
        expect(distance).toBeLessThan(10000)
      })
    })
  })

  describe('zero-length lines', () => {
    it('returns distance to single point for zero-length line', () => {
      const zeroLine = createLine({
        startx: 100,
        starty: 100,
        endx: 100,
        endy: 100,
        length: 0
      })
      
      const testPoint: Point = { h: 103, v: 104 }
      // Should be distance to (100,100)
      // dx = 3, dy = 4, distance^2 = 9 + 16 = 25
      expect(pt2line(testPoint, zeroLine)).toBe(25)
    })
  })

  describe('up_down direction', () => {
    it('handles upward sloping lines', () => {
      const upLine = createLine({
        type: LINE_TYPE.NE,
        startx: 100,
        starty: 150,
        endx: 200,
        endy: 100, // Going up (y decreases)
        length: 100,
        up_down: LINE_DIR.UP
      })
      
      const testPoint: Point = { h: 150, v: 125 }
      const distance = pt2line(testPoint, upLine)
      expect(distance).toBeLessThan(10000)
    })

    it('handles downward sloping lines', () => {
      const downLine = createLine({
        type: LINE_TYPE.NE,
        startx: 100,
        starty: 100,
        endx: 200,
        endy: 150, // Going down (y increases)
        length: 100,
        up_down: LINE_DIR.DN
      })
      
      const testPoint: Point = { h: 150, v: 125 }
      const distance = pt2line(testPoint, downLine)
      expect(distance).toBeLessThan(10000)
    })
  })

  describe('edge cases', () => {
    it('handles lines at origin', () => {
      const originLine = createLine({
        startx: 0,
        starty: 0,
        endx: 100,
        endy: 0,
        type: LINE_TYPE.E
      })
      
      const testPoint: Point = { h: 50, v: 10 }
      expect(pt2line(testPoint, originLine)).toBe(100) // 10^2
    })

    it('handles negative coordinates', () => {
      const negativeLine = createLine({
        startx: -100,
        starty: -100,
        endx: -50,
        endy: -100,
        type: LINE_TYPE.E
      })
      
      const testPoint: Point = { h: -75, v: -95 }
      expect(pt2line(testPoint, negativeLine)).toBe(25) // 5^2
    })

    it('maintains consistency with endpoint addition of 10', () => {
      const line = createLine({
        startx: 100,
        starty: 100,
        endx: 200,
        endy: 100,
        type: LINE_TYPE.E
      })
      
      // Point exactly at start but slightly off
      const atStart: Point = { h: 100, v: 103 }
      const distToStart = pt2line(atStart, line)
      
      // Point before start should add 10
      const beforeStart: Point = { h: 99, v: 103 }
      const distBeforeStart = pt2line(beforeStart, line)
      
      // Distance before start should be distance to start + 10
      expect(distBeforeStart).toBeGreaterThan(distToStart)
    })
  })
})