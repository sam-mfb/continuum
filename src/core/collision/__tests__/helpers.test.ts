import { describe, it, expect } from 'vitest'
import { bitmapToCollisionItem } from '../helpers'
import { Collision } from '../constants'
import type { MonochromeBitmap } from '@/lib/bitmap'

/**
 * Helper to create a MonochromeBitmap with given dimensions and data
 */
function createBitmap(
  width: number,
  height: number,
  data: number[]
): MonochromeBitmap {
  return {
    data: new Uint8Array(data),
    width,
    height,
    rowBytes: width / 8
  }
}

describe('bitmapToCollisionItem', () => {
  it('returns empty array for bitmap with no black pixels (all white)', () => {
    const bitmap = createBitmap(8, 2, [0x00, 0x00])
    const result = bitmapToCollisionItem(bitmap, Collision.LETHAL)
    expect(result).toEqual([])
  })

  it('returns single point for bitmap with one black pixel', () => {
    // 0x80 = 10000000 in binary (leftmost pixel is black)
    const bitmap = createBitmap(8, 1, [0x80])
    const result = bitmapToCollisionItem(bitmap, Collision.BOUNCE)
    expect(result).toEqual([{ x: 0, y: 0, collision: Collision.BOUNCE }])
  })

  it('correctly handles big-endian bit order (MSB = leftmost pixel)', () => {
    // 0xA5 = 10100101 in binary
    // This represents: ■ □ ■ □ □ ■ □ ■
    // Black pixels at x: 0, 2, 5, 7
    const bitmap = createBitmap(8, 1, [0xa5])
    const result = bitmapToCollisionItem(bitmap, Collision.LETHAL)
    expect(result).toEqual([
      { x: 0, y: 0, collision: Collision.LETHAL },
      { x: 2, y: 0, collision: Collision.LETHAL },
      { x: 5, y: 0, collision: Collision.LETHAL },
      { x: 7, y: 0, collision: Collision.LETHAL }
    ])
  })

  it('returns points with correct x,y coordinates', () => {
    // 16x2 bitmap
    // Row 0: 0xFF 0x00 = 11111111 00000000 (8 black pixels on left)
    // Row 1: 0x00 0xFF = 00000000 11111111 (8 black pixels on right)
    const bitmap = createBitmap(16, 2, [0xff, 0x00, 0x00, 0xff])
    const result = bitmapToCollisionItem(bitmap, Collision.BOUNCE)
    expect(result).toEqual([
      { x: 0, y: 0, collision: Collision.BOUNCE },
      { x: 1, y: 0, collision: Collision.BOUNCE },
      { x: 2, y: 0, collision: Collision.BOUNCE },
      { x: 3, y: 0, collision: Collision.BOUNCE },
      { x: 4, y: 0, collision: Collision.BOUNCE },
      { x: 5, y: 0, collision: Collision.BOUNCE },
      { x: 6, y: 0, collision: Collision.BOUNCE },
      { x: 7, y: 0, collision: Collision.BOUNCE },
      { x: 8, y: 1, collision: Collision.BOUNCE },
      { x: 9, y: 1, collision: Collision.BOUNCE },
      { x: 10, y: 1, collision: Collision.BOUNCE },
      { x: 11, y: 1, collision: Collision.BOUNCE },
      { x: 12, y: 1, collision: Collision.BOUNCE },
      { x: 13, y: 1, collision: Collision.BOUNCE },
      { x: 14, y: 1, collision: Collision.BOUNCE },
      { x: 15, y: 1, collision: Collision.BOUNCE }
    ])
  })

  it('handles bitmap with scattered black pixels', () => {
    // 16x2 bitmap with scattered pixels
    // Row 0: 0x81 0x00 = 10000001 00000000 (pixels at x=0 and x=7)
    // Row 1: 0x00 0x81 = 00000000 10000001 (pixels at x=8 and x=15)
    const bitmap = createBitmap(16, 2, [0x81, 0x00, 0x00, 0x81])
    const result = bitmapToCollisionItem(bitmap, Collision.LETHAL)
    expect(result).toEqual([
      { x: 0, y: 0, collision: Collision.LETHAL },
      { x: 7, y: 0, collision: Collision.LETHAL },
      { x: 8, y: 1, collision: Collision.LETHAL },
      { x: 15, y: 1, collision: Collision.LETHAL }
    ])
  })

  it('applies localX offset to all points', () => {
    // 0x80 = 10000000 (pixel at x=0)
    const bitmap = createBitmap(8, 1, [0x80])
    const result = bitmapToCollisionItem(bitmap, Collision.BOUNCE, 100)
    expect(result).toEqual([{ x: 100, y: 0, collision: Collision.BOUNCE }])
  })

  it('applies localY offset to all points', () => {
    // 0x80 = 10000000 (pixel at x=0, y=0)
    const bitmap = createBitmap(8, 1, [0x80])
    const result = bitmapToCollisionItem(
      bitmap,
      Collision.BOUNCE,
      undefined,
      50
    )
    expect(result).toEqual([{ x: 0, y: 50, collision: Collision.BOUNCE }])
  })

  it('applies both localX and localY offsets to all points', () => {
    // 0xC0 = 11000000 (pixels at x=0 and x=1)
    const bitmap = createBitmap(8, 2, [0xc0, 0xc0])
    const result = bitmapToCollisionItem(bitmap, Collision.LETHAL, 10, 20)
    expect(result).toEqual([
      { x: 10, y: 20, collision: Collision.LETHAL },
      { x: 11, y: 20, collision: Collision.LETHAL },
      { x: 10, y: 21, collision: Collision.LETHAL },
      { x: 11, y: 21, collision: Collision.LETHAL }
    ])
  })

  it('applies offsets with zero values correctly', () => {
    // 0x80 = 10000000 (pixel at x=0)
    const bitmap = createBitmap(8, 1, [0x80])
    const result = bitmapToCollisionItem(bitmap, Collision.BOUNCE, 0, 0)
    expect(result).toEqual([{ x: 0, y: 0, collision: Collision.BOUNCE }])
  })
})
