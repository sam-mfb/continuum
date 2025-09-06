import { describe, it, expect } from 'vitest'
import { validateBitmap } from './operations'
import type { MonochromeBitmap } from './types'

describe('validateBitmap', () => {
  it('returns true for a valid bitmap with width multiple of 8', () => {
    const bitmap: MonochromeBitmap = {
      width: 32,
      height: 16,
      rowBytes: 4, // 32 / 8 = 4
      data: new Uint8Array(64) // 16 * 4 = 64
    }
    expect(validateBitmap(bitmap)).toBe(true)
  })

  it('returns true for a valid bitmap with width not multiple of 8', () => {
    const bitmap: MonochromeBitmap = {
      width: 13,
      height: 5,
      rowBytes: 2, // Math.ceil(13 / 8) = 2
      data: new Uint8Array(10) // 5 * 2 = 10
    }
    expect(validateBitmap(bitmap)).toBe(true)
  })

  it('returns true for a 1x1 bitmap', () => {
    const bitmap: MonochromeBitmap = {
      width: 1,
      height: 1,
      rowBytes: 1, // Math.ceil(1 / 8) = 1
      data: new Uint8Array(1)
    }
    expect(validateBitmap(bitmap)).toBe(true)
  })

  it('returns true for a wide bitmap', () => {
    const bitmap: MonochromeBitmap = {
      width: 100,
      height: 1,
      rowBytes: 13, // Math.ceil(100 / 8) = 13
      data: new Uint8Array(13)
    }
    expect(validateBitmap(bitmap)).toBe(true)
  })

  it('returns true for a tall bitmap', () => {
    const bitmap: MonochromeBitmap = {
      width: 8,
      height: 100,
      rowBytes: 1, // 8 / 8 = 1
      data: new Uint8Array(100)
    }
    expect(validateBitmap(bitmap)).toBe(true)
  })

  it('returns false when rowBytes is too small', () => {
    const bitmap: MonochromeBitmap = {
      width: 32,
      height: 16,
      rowBytes: 3, // Should be 4
      data: new Uint8Array(48) // 16 * 3 = 48
    }
    expect(validateBitmap(bitmap)).toBe(false)
  })

  it('returns false when rowBytes is too large', () => {
    const bitmap: MonochromeBitmap = {
      width: 32,
      height: 16,
      rowBytes: 5, // Should be 4
      data: new Uint8Array(80) // 16 * 5 = 80
    }
    expect(validateBitmap(bitmap)).toBe(false)
  })

  it('returns false when data array is too small', () => {
    const bitmap: MonochromeBitmap = {
      width: 32,
      height: 16,
      rowBytes: 4,
      data: new Uint8Array(63) // Should be 64
    }
    expect(validateBitmap(bitmap)).toBe(false)
  })

  it('returns false when data array is too large', () => {
    const bitmap: MonochromeBitmap = {
      width: 32,
      height: 16,
      rowBytes: 4,
      data: new Uint8Array(65) // Should be 64
    }
    expect(validateBitmap(bitmap)).toBe(false)
  })

  it('returns false when rowBytes is 0 for non-zero width', () => {
    const bitmap: MonochromeBitmap = {
      width: 7,
      height: 10,
      rowBytes: 0, // Should be 1
      data: new Uint8Array(0)
    }
    expect(validateBitmap(bitmap)).toBe(false)
  })

  it('returns false when data is empty for non-zero dimensions', () => {
    const bitmap: MonochromeBitmap = {
      width: 16,
      height: 8,
      rowBytes: 2,
      data: new Uint8Array(0) // Should be 16
    }
    expect(validateBitmap(bitmap)).toBe(false)
  })

  it('handles edge case of 7-pixel width', () => {
    const bitmap: MonochromeBitmap = {
      width: 7,
      height: 3,
      rowBytes: 1, // Math.ceil(7 / 8) = 1
      data: new Uint8Array(3)
    }
    expect(validateBitmap(bitmap)).toBe(true)
  })

  it('handles edge case of 9-pixel width', () => {
    const bitmap: MonochromeBitmap = {
      width: 9,
      height: 2,
      rowBytes: 2, // Math.ceil(9 / 8) = 2
      data: new Uint8Array(4)
    }
    expect(validateBitmap(bitmap)).toBe(true)
  })

  it('returns false for inconsistent data with fractional rowBytes calculation', () => {
    const bitmap: MonochromeBitmap = {
      width: 15,
      height: 4,
      rowBytes: 1, // Should be 2 (Math.ceil(15 / 8) = 2)
      data: new Uint8Array(4) // Would be 8 with correct rowBytes
    }
    expect(validateBitmap(bitmap)).toBe(false)
  })
})
