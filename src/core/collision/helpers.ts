import type { MonochromeBitmap } from '@/lib/bitmap'
import type { CollisionItem } from './types'

/**
 * Converts all the black pixels in the monochrome bitmap to
 * CollisionPoints and returns a CollisionItem (colleciton of
 * those points
 */
export function bitmapToCollisionItem(bitmap: MonochromeBitmap): CollisionItem {
  const points: CollisionItem = []

  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      const byteIndex = y * bitmap.rowBytes + Math.floor(x / 8)
      const bitIndex = 7 - (x % 8) // Big-endian bit order
      const byte = bitmap.data[byteIndex] ?? 0
      const isBlack = (byte & (1 << bitIndex)) !== 0

      if (isBlack) {
        points.push({ x, y })
      }
    }
  }

  return points
}
