import { describe, test, expect } from 'vitest'
import { idiv, imod, imul } from './integerMath'

describe('integerMath', () => {
  describe('idiv - integer division (truncate toward zero)', () => {
    test('divides positive numbers correctly', () => {
      expect(idiv(10, 3)).toBe(3)  // 10/3 = 3.333... -> 3
      expect(idiv(15, 4)).toBe(3)  // 15/4 = 3.75 -> 3
      expect(idiv(20, 5)).toBe(4)  // 20/5 = 4 (exact)
      expect(idiv(7, 2)).toBe(3)   // 7/2 = 3.5 -> 3
      expect(idiv(80, 15)).toBe(5) // 80/15 = 5.333... -> 5 (shot collision case)
      expect(idiv(80, 16)).toBe(5) // 80/16 = 5 (exact)
    })

    test('divides negative dividend correctly (truncates toward zero)', () => {
      expect(idiv(-10, 3)).toBe(-3)  // -10/3 = -3.333... -> -3 (not -4!)
      expect(idiv(-15, 4)).toBe(-3)  // -15/4 = -3.75 -> -3 (not -4!)
      expect(idiv(-20, 5)).toBe(-4)  // -20/5 = -4 (exact)
      expect(idiv(-7, 2)).toBe(-3)   // -7/2 = -3.5 -> -3 (not -4!)
      expect(idiv(-80, 15)).toBe(-5) // -80/15 = -5.333... -> -5 (not -6!)
    })

    test('divides with negative divisor correctly', () => {
      expect(idiv(10, -3)).toBe(-3)  // 10/-3 = -3.333... -> -3
      expect(idiv(15, -4)).toBe(-3)  // 15/-4 = -3.75 -> -3
      expect(idiv(20, -5)).toBe(-4)  // 20/-5 = -4 (exact)
      expect(idiv(80, -16)).toBe(-5) // 80/-16 = -5 (exact)
    })

    test('divides with both negative correctly', () => {
      expect(idiv(-10, -3)).toBe(3)  // -10/-3 = 3.333... -> 3
      expect(idiv(-15, -4)).toBe(3)  // -15/-4 = 3.75 -> 3
      expect(idiv(-20, -5)).toBe(4)  // -20/-5 = 4 (exact)
    })

    test('handles zero dividend', () => {
      expect(idiv(0, 5)).toBe(0)
      // JavaScript has -0 and +0, but they're functionally equivalent for our use
      expect(idiv(0, -5)).toBe(-0) // Math.trunc(0/-5) gives -0 in JS
    })

    test('truncates non-integer inputs before division', () => {
      expect(idiv(10.7, 3.2)).toBe(3)  // truncates to 10/3 = 3
      expect(idiv(-10.7, 3.8)).toBe(-3) // truncates to -10/3 = -3
    })

    test('matches C behavior for shot/wall collision cases', () => {
      // Shot backup: velocity / 3
      expect(idiv(16, 3)).toBe(5)   // positive velocity backup
      expect(idiv(-16, 3)).toBe(-5) // negative velocity backup (westward)
      
      // Wall collision: distance / velocity
      expect(idiv(80, 15)).toBe(5)  // 5.333... -> 5 frames
      expect(idiv(80, 16)).toBe(5)  // 5 exactly
      expect(idiv(80, 17)).toBe(4)  // 4.7... -> 4 frames
      
      // Negative velocities (moving left/west)
      expect(idiv(-80, -15)).toBe(5) // distance and velocity both negative
      expect(idiv(80, -15)).toBe(-5) // positive distance, negative velocity
    })

    test('differs from Math.floor for negative numbers', () => {
      // Math.floor rounds toward negative infinity
      // idiv truncates toward zero
      expect(Math.floor(-10 / 3)).toBe(-4)  // Math.floor
      expect(idiv(-10, 3)).toBe(-3)         // idiv (C-style)
      
      expect(Math.floor(-7 / 2)).toBe(-4)   // Math.floor
      expect(idiv(-7, 2)).toBe(-3)          // idiv (C-style)
    })
  })

  describe('imod - integer modulo', () => {
    test('calculates modulo for positive numbers', () => {
      expect(imod(10, 3)).toBe(1)  // 10 % 3 = 1
      expect(imod(15, 4)).toBe(3)  // 15 % 4 = 3
      expect(imod(20, 5)).toBe(0)  // 20 % 5 = 0
      expect(imod(80, 15)).toBe(5) // 80 % 15 = 5 (the remainder from collision calc)
    })

    test('calculates modulo with negative dividend (C behavior)', () => {
      // In C, sign matches dividend
      expect(imod(-10, 3)).toBe(-1)  // -10 % 3 = -1
      expect(imod(-15, 4)).toBe(-3)  // -15 % 4 = -3
      expect(imod(-80, 15)).toBe(-5) // -80 % 15 = -5
    })

    test('calculates modulo with negative divisor', () => {
      expect(imod(10, -3)).toBe(1)   // 10 % -3 = 1
      expect(imod(-10, -3)).toBe(-1) // -10 % -3 = -1
    })

    test('truncates non-integer inputs', () => {
      expect(imod(10.7, 3.2)).toBe(1) // truncates to 10 % 3 = 1
    })
  })

  describe('imul - integer multiplication', () => {
    test('multiplies positive numbers', () => {
      expect(imul(5, 3)).toBe(15)
      expect(imul(10, 10)).toBe(100)
      expect(imul(7, 8)).toBe(56)
    })

    test('multiplies negative numbers', () => {
      expect(imul(-5, 3)).toBe(-15)
      expect(imul(5, -3)).toBe(-15)
      expect(imul(-5, -3)).toBe(15)
    })

    test('handles zero', () => {
      expect(imul(0, 5)).toBe(0)
      expect(imul(5, 0)).toBe(0)
      expect(imul(0, 0)).toBe(0)
    })

    test('truncates non-integer inputs', () => {
      expect(imul(5.7, 3.2)).toBe(15) // truncates to 5 * 3 = 15
    })

    test('handles 32-bit overflow correctly', () => {
      // Math.imul handles 32-bit integer overflow
      // This should match C's behavior for 32-bit ints
      const large = 0x7FFFFFFF // Max 32-bit signed int
      expect(imul(large, 2)).toBe(-2) // Overflows as expected
    })
  })

  describe('edge cases', () => {
    test('division by 1', () => {
      expect(idiv(5, 1)).toBe(5)
      expect(idiv(-5, 1)).toBe(-5)
    })

    test('division of 1', () => {
      expect(idiv(1, 5)).toBe(0)
      expect(idiv(1, -5)).toBe(-0)  // JS quirk: Math.trunc gives -0
      expect(idiv(-1, 5)).toBe(-0)  // JS quirk: Math.trunc gives -0
      expect(idiv(-1, -5)).toBe(0)
    })

    test('very small numbers round to zero', () => {
      expect(idiv(1, 10)).toBe(0)
      expect(idiv(-1, 10)).toBe(-0)  // JS quirk: Math.trunc gives -0
      expect(idiv(2, 5)).toBe(0)
      expect(idiv(-2, 5)).toBe(-0)   // JS quirk: Math.trunc gives -0
    })
  })

  describe('comparison with Math functions', () => {
    test('idiv vs Math.trunc', () => {
      // idiv should match Math.trunc(a/b) exactly
      expect(idiv(10, 3)).toBe(Math.trunc(10/3))
      expect(idiv(-10, 3)).toBe(Math.trunc(-10/3))
      expect(idiv(10, -3)).toBe(Math.trunc(10/-3))
      expect(idiv(-10, -3)).toBe(Math.trunc(-10/-3))
    })

    test('idiv vs Math.floor (should differ for negative)', () => {
      expect(idiv(10, 3)).toBe(Math.floor(10/3))     // Same for positive
      expect(idiv(-10, 3)).not.toBe(Math.floor(-10/3)) // Different for negative!
      expect(idiv(-10, 3)).toBe(-3)                  // Truncates toward zero
      expect(Math.floor(-10/3)).toBe(-4)             // Rounds down
    })
  })
})