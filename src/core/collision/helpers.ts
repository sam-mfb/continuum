import type { MonochromeBitmap } from '@/lib/bitmap'
import type { CollisionItem } from './types'

/**
 * Converts all the black pixels in the monochrome bitmap to
 * CollisionPoints and returns a CollisionItem (colleciton of
 * those points
 */
export function bitmapToCollisionItem(bitmap: MonochromeBitmap): CollisionItem {
  throw new Error('Function not implemented')
}
