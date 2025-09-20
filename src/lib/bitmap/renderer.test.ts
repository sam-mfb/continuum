/**
 * Tests for BitmapRenderer pure function pattern
 */

import { describe, it, expect } from 'vitest'
import { createMonochromeBitmap } from './create'
import type { BitmapRenderer } from './types'

describe('BitmapRenderer pure function pattern', () => {
  it('returns a new bitmap without modifying the input', () => {
    const testRenderer: BitmapRenderer = (bitmap, _frame, _env) => {
      // Create a new bitmap with modified data
      const result = {
        ...bitmap,
        data: new Uint8Array(bitmap.data)
      }

      // Modify the result
      result.data[0] = 0xFF

      return result
    }

    const inputBitmap = createMonochromeBitmap(8, 8)
    const originalData = new Uint8Array(inputBitmap.data)

    const outputBitmap = testRenderer(
      inputBitmap,
      {
        frameCount: 0,
        deltaTime: 0,
        totalTime: 0,
        targetDelta: 50,
        keysDown: new Set(),
        keysPressed: new Set(),
        keysReleased: new Set()
      },
      {
        width: 512,
        height: 342,
        fps: 20
      }
    )

    // Input bitmap should be unchanged
    expect(inputBitmap.data).toEqual(originalData)

    // Output bitmap should have the modification
    expect(outputBitmap.data[0]).toBe(0xFF)

    // Output should be a different object
    expect(outputBitmap).not.toBe(inputBitmap)
  })

  it('can chain renderers together', () => {
    const renderer1: BitmapRenderer = (bitmap, _frame, _env) => {
      const result = {
        ...bitmap,
        data: new Uint8Array(bitmap.data)
      }
      result.data[0] = 0x01
      return result
    }

    const renderer2: BitmapRenderer = (bitmap, _frame, _env) => {
      const result = {
        ...bitmap,
        data: new Uint8Array(bitmap.data)
      }
      result.data[1] = 0x02
      return result
    }

    const inputBitmap = createMonochromeBitmap(8, 8)
    const frame = {
      frameCount: 0,
      deltaTime: 0,
      totalTime: 0,
      targetDelta: 50,
      keysDown: new Set<string>(),
      keysPressed: new Set<string>(),
      keysReleased: new Set<string>()
    }
    const env = { width: 512, height: 342, fps: 20 }

    // Chain the renderers
    const intermediate = renderer1(inputBitmap, frame, env)
    const final = renderer2(intermediate, frame, env)

    // Check the results
    expect(inputBitmap.data[0]).toBe(0x00)
    expect(inputBitmap.data[1]).toBe(0x00)

    expect(intermediate.data[0]).toBe(0x01)
    expect(intermediate.data[1]).toBe(0x00)

    expect(final.data[0]).toBe(0x01)
    expect(final.data[1]).toBe(0x02)
  })
})