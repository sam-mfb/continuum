import { describe, it, expect } from 'vitest'
import { isOnRightSide } from './viewport'

describe('isOnRightSide', () => {
  it('returns false for non-wrapping worlds', () => {
    expect(isOnRightSide(900, 512, 1024, false)).toBe(false)
  })

  it('returns false when viewport is far from right edge', () => {
    expect(isOnRightSide(100, 512, 1024, true)).toBe(false)
  })

  it('returns true when viewport extends near right edge in wrapping world', () => {
    // viewport at 500 + width 512 = 1012, which is > 1024 - 48 = 976
    expect(isOnRightSide(500, 512, 1024, true)).toBe(true)
  })

  it('returns true when viewport is at exact threshold', () => {
    // viewport at 464 + width 512 = 976, which equals 1024 - 48
    expect(isOnRightSide(464, 512, 1024, true)).toBe(false)
    // viewport at 465 + width 512 = 977, which is > 1024 - 48 = 976  
    expect(isOnRightSide(465, 512, 1024, true)).toBe(true)
  })
})
