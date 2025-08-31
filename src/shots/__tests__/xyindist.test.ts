import { describe, it, expect } from 'vitest'
import { xyindist } from '../xyindist'

/**
 * Tests for xyindist based on orig/Sources/Play.c:1182
 * "XYINDIST: Returns TRUE iff x^2 + y^2 < dist^2"
 * 
 * Note: The assembly shows it actually returns TRUE when x² + y² <= dist²
 * based on line 1204: "cmp.w D0, D1; bgt.s @false"
 * This compares dist² with sum and branches to false if sum > dist²
 * So it returns TRUE when sum <= dist²
 */
describe('xyindist', () => {
  describe('basic distance checks', () => {
    it('returns true for point at origin', () => {
      expect(xyindist(0, 0, 10)).toBe(true)
    })

    it('returns false for point outside radius', () => {
      // Point at (10, 10) has distance √200 ≈ 14.14, which is > 10
      expect(xyindist(10, 10, 10)).toBe(false)
    })

    it('returns true for point inside radius', () => {
      // Point at (3, 4) has distance 5, which is < 10
      expect(xyindist(3, 4, 10)).toBe(true)
    })

    it('returns true for point exactly on radius', () => {
      // Point at (6, 8) has distance 10 exactly (6² + 8² = 36 + 64 = 100 = 10²)
      expect(xyindist(6, 8, 10)).toBe(true) // Should be true based on <= comparison
    })
  })

  describe('bounding box early rejection', () => {
    it('returns false if x >= dist', () => {
      expect(xyindist(10, 0, 10)).toBe(false)
      expect(xyindist(11, 0, 10)).toBe(false)
    })

    it('returns false if y >= dist', () => {
      expect(xyindist(0, 10, 10)).toBe(false)
      expect(xyindist(0, 11, 10)).toBe(false)
    })

    it('returns false if x <= -dist', () => {
      expect(xyindist(-10, 0, 10)).toBe(false)
      expect(xyindist(-11, 0, 10)).toBe(false)
    })

    it('returns false if y <= -dist', () => {
      expect(xyindist(0, -10, 10)).toBe(false)
      expect(xyindist(0, -11, 10)).toBe(false)
    })

    it('passes bounding box check for x = dist - 1', () => {
      // x=9, y=0 should pass bounding box and distance check
      expect(xyindist(9, 0, 10)).toBe(true)
    })

    it('passes bounding box check for y = dist - 1', () => {
      // x=0, y=9 should pass bounding box and distance check
      expect(xyindist(0, 9, 10)).toBe(true)
    })
  })

  describe('ship death bunker destruction (SKILLBRADIUS = 30)', () => {
    const SKILLBRADIUS = 30

    it('returns true for bunker very close to ship', () => {
      // Bunker 10 pixels away from ship
      expect(xyindist(10, 0, SKILLBRADIUS)).toBe(true)
    })

    it('returns true for bunker at diagonal within radius', () => {
      // Bunker at (20, 20) from ship: distance = √800 ≈ 28.28 < 30
      expect(xyindist(20, 20, SKILLBRADIUS)).toBe(true)
    })

    it('returns true for bunker exactly at radius', () => {
      // Bunker at (18, 24) from ship: distance = 30 exactly (18² + 24² = 324 + 576 = 900 = 30²)
      expect(xyindist(18, 24, SKILLBRADIUS)).toBe(true)
    })

    it('returns false for bunker just outside radius', () => {
      // Bunker at (25, 25) from ship: distance = √1250 ≈ 35.36 > 30
      expect(xyindist(25, 25, SKILLBRADIUS)).toBe(false)
    })

    it('returns false for bunker far away', () => {
      // Bunker at (50, 50) from ship
      expect(xyindist(50, 50, SKILLBRADIUS)).toBe(false)
    })
  })

  describe('negative coordinates', () => {
    it('handles negative x correctly', () => {
      expect(xyindist(-3, 4, 10)).toBe(true) // distance = 5
      expect(xyindist(-10, 10, 10)).toBe(false) // distance = √200 ≈ 14.14
    })

    it('handles negative y correctly', () => {
      expect(xyindist(3, -4, 10)).toBe(true) // distance = 5
      expect(xyindist(10, -10, 10)).toBe(false) // distance = √200 ≈ 14.14
    })

    it('handles both negative correctly', () => {
      expect(xyindist(-3, -4, 10)).toBe(true) // distance = 5
      expect(xyindist(-8, -6, 10)).toBe(true) // distance = 10
      expect(xyindist(-10, -10, 10)).toBe(false) // distance = √200 ≈ 14.14
    })
  })

  describe('edge cases', () => {
    it('handles zero distance', () => {
      expect(xyindist(0, 0, 0)).toBe(false) // 0² + 0² = 0, but bounding box rejects
      expect(xyindist(1, 0, 0)).toBe(false)
      expect(xyindist(0, 1, 0)).toBe(false)
    })

    it('handles very large distances', () => {
      // Test with values that might cause overflow in 16-bit arithmetic
      expect(xyindist(100, 100, 150)).toBe(true) // √20000 ≈ 141.42 < 150
      expect(xyindist(100, 100, 140)).toBe(false) // √20000 ≈ 141.42 > 140
    })

    it('handles maximum 16-bit signed values', () => {
      // Max positive signed 16-bit is 32767
      // This tests potential overflow: 255² + 255² = 130050
      // Which is larger than 65535 (max unsigned 16-bit)
      expect(xyindist(255, 255, 361)).toBe(true) // √130050 ≈ 360.6 < 361
      expect(xyindist(255, 255, 360)).toBe(false) // √130050 ≈ 360.6 > 360
    })
  })

  describe('symmetry tests', () => {
    it('is symmetric in x and y', () => {
      expect(xyindist(3, 4, 10)).toBe(xyindist(4, 3, 10))
      expect(xyindist(7, 2, 10)).toBe(xyindist(2, 7, 10))
    })

    it('is symmetric in all quadrants', () => {
      const dist = 10
      expect(xyindist(3, 4, dist)).toBe(xyindist(-3, 4, dist))
      expect(xyindist(3, 4, dist)).toBe(xyindist(3, -4, dist))
      expect(xyindist(3, 4, dist)).toBe(xyindist(-3, -4, dist))
    })
  })
})