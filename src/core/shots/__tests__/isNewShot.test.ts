import { describe, it, expect } from 'vitest'
import { isNewShot } from '../isNewShot'
import type { ShotRec } from '../types'

/**
 * Helper to create a ShotRec with default values
 */
function createShot(overrides: Partial<ShotRec> = {}): ShotRec {
  return {
    x: 0,
    y: 0,
    x8: 0,
    y8: 0,
    lifecount: 0,
    v: 0,
    h: 0,
    strafedir: -1,
    btime: 0,
    hitlineId: '',
    origin: { x: 0, y: 0 },
    justDied: false,
    ...overrides
  }
}

describe('isNewShot', () => {
  it('returns false when arrays have different lengths', () => {
    const prev = [createShot()]
    const curr = [createShot(), createShot()]
    expect(isNewShot(prev, curr)).toBe(false)
  })

  it('returns false when no shots have changed', () => {
    const shot1 = createShot({ x: 10, y: 20, lifecount: 5 })
    const shot2 = createShot({ x: 30, y: 40, lifecount: 0 })
    const prev = [shot1, shot2]
    const curr = [shot1, shot2]
    expect(isNewShot(prev, curr)).toBe(false)
  })

  it('returns true when dead shot is replaced with live shot', () => {
    const prev = [
      createShot({ lifecount: 0, x: 0, y: 0 }),
      createShot({ lifecount: 5, x: 50, y: 50 })
    ]
    const curr = [
      createShot({ lifecount: 10, x: 100, y: 100, origin: { x: 100, y: 100 } }),
      createShot({ lifecount: 4, x: 51, y: 51 }) // This one just moved
    ]
    expect(isNewShot(prev, curr)).toBe(true)
  })

  it('returns true when dead shot is replaced with immediately dead shot', () => {
    // This happens when a shot hits a wall on spawn
    const prev = [createShot({ lifecount: 0, x: 0, y: 0 })]
    const curr = [
      createShot({
        lifecount: 0, // Still dead
        x: 100, // But at new position
        y: 100,
        x8: 800,
        y8: 800,
        h: 5,
        v: 3,
        btime: 10, // Has bounce time
        origin: { x: 100, y: 100 }
      })
    ]
    expect(isNewShot(prev, curr)).toBe(true)
  })

  it('returns false when active shot just moves', () => {
    const prev = [
      createShot({ lifecount: 10, x: 100, y: 100, h: 5, v: 3 })
    ]
    const curr = [
      createShot({ lifecount: 9, x: 105, y: 103, h: 5, v: 3 })
    ]
    expect(isNewShot(prev, curr)).toBe(false)
  })

  it('returns true for multiple new shots in single update', () => {
    const prev = [
      createShot({ lifecount: 0 }),
      createShot({ lifecount: 0 }),
      createShot({ lifecount: 5, x: 50 })
    ]
    const curr = [
      createShot({ lifecount: 10, x: 10, y: 10 }), // New shot
      createShot({ lifecount: 0 }), // Still dead, unchanged
      createShot({ lifecount: 4, x: 51 }) // Just moved
    ]
    expect(isNewShot(prev, curr)).toBe(true)
  })

  it('returns true when origin changes on dead shot', () => {
    const prev = [createShot({ lifecount: 0, origin: { x: 0, y: 0 } })]
    const curr = [createShot({ lifecount: 0, origin: { x: 100, y: 100 } })]
    expect(isNewShot(prev, curr)).toBe(true)
  })

  it('returns true when velocity changes on dead shot', () => {
    const prev = [createShot({ lifecount: 0, h: 0, v: 0 })]
    const curr = [createShot({ lifecount: 0, h: 5, v: 3 })]
    expect(isNewShot(prev, curr)).toBe(true)
  })

  it('returns true when strafedir changes on dead shot', () => {
    const prev = [createShot({ lifecount: 0, strafedir: -1 })]
    const curr = [createShot({ lifecount: 0, strafedir: 2 })]
    expect(isNewShot(prev, curr)).toBe(true)
  })

  it('returns false when only justDied flag changes', () => {
    const prev = [createShot({ lifecount: 0, justDied: false })]
    const curr = [createShot({ lifecount: 0, justDied: true })]
    expect(isNewShot(prev, curr)).toBe(false)
  })

  it('returns false with empty arrays', () => {
    expect(isNewShot([], [])).toBe(false)
  })

  it('handles arrays with null/undefined gracefully', () => {
    const prev = [null as any, createShot()]
    const curr = [null as any, createShot()]
    expect(isNewShot(prev, curr)).toBe(false)
  })
})