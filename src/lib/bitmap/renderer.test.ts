/**
 * Tests for BitmapRenderer pure function pattern
 */

import { describe, it, expect } from 'vitest'
import { createGameBitmap } from './create'
import type { BitmapRenderer, FrameInfo, KeyInfo } from './types'

describe('BitmapRenderer pure function pattern', () => {
  it('creates and returns a new bitmap', () => {
    const testRenderer: BitmapRenderer = (
      _frame: FrameInfo,
      _keys: KeyInfo
    ) => {
      // Create a new bitmap
      const result = createGameBitmap()

      // Modify the result
      result.data[0] = 0xff

      return result
    }

    const frame: FrameInfo = {
      frameCount: 0,
      deltaTime: 0,
      totalTime: 0,
      targetDelta: 50
    }
    const keys: KeyInfo = {
      keysDown: new Set(),
      keysPressed: new Set(),
      keysReleased: new Set()
    }

    const outputBitmap = testRenderer(frame, keys)

    // Output bitmap should have the modification
    expect(outputBitmap.data[0]).toBe(0xff)

    // Output should be a proper game bitmap
    expect(outputBitmap.width).toBe(512)
    expect(outputBitmap.height).toBe(342)
  })

  it('can compose renderers together', () => {
    const renderer1: BitmapRenderer = (_frame: FrameInfo, _keys: KeyInfo) => {
      const result = createGameBitmap()
      result.data[0] = 0x01
      return result
    }

    const renderer2: BitmapRenderer = (_frame: FrameInfo, _keys: KeyInfo) => {
      const result = createGameBitmap()
      result.data[0] = 0x01 // Copy renderer1's change
      result.data[1] = 0x02 // Add renderer2's change
      return result
    }

    const frame: FrameInfo = {
      frameCount: 0,
      deltaTime: 0,
      totalTime: 0,
      targetDelta: 50
    }
    const keys: KeyInfo = {
      keysDown: new Set<string>(),
      keysPressed: new Set<string>(),
      keysReleased: new Set<string>()
    }

    // Call the renderers
    const result1 = renderer1(frame, keys)
    const result2 = renderer2(frame, keys)

    // Check the results
    expect(result1.data[0]).toBe(0x01)
    expect(result1.data[1]).toBe(0x00)

    expect(result2.data[0]).toBe(0x01)
    expect(result2.data[1]).toBe(0x02)
  })
})
