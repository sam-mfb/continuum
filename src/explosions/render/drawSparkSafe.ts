import type { MonochromeBitmap } from '@/bitmap'
import { cloneBitmap } from '@/bitmap'
import { SBARHT } from '@/screen/constants'

/**
 * Draw a 2x2 white dot on the screen (used for explosion sparks)
 * From orig/Sources/Draw.c at draw_spark_safe():600-614
 *
 * This function draws a 2x2 pixel white dot at the specified position.
 * Unlike draw_dot_safe which uses OR to set bits (black), this uses
 * AND to clear bits (white on black background).
 *
 * @param deps - Drawing dependencies
 * @param deps.x - Screen x coordinate (0-based, relative to viewport)
 * @param deps.y - Screen y coordinate (0-based, relative to viewport)
 * @returns Transform function that draws the spark on a bitmap
 */
export function drawSparkSafe(deps: {
  x: number
  y: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y } = deps
    
    // Clone the bitmap to ensure immutability
    const result = cloneBitmap(screen)

    // add.w #SBARHT, y /* move to view area */ (Draw.c:605)
    const adjustedY = y + SBARHT

    // Calculate byte position in screen buffer
    // FIND_WADDRESS(x, y) (Draw.c:607)
    const rowOffset = adjustedY * result.rowBytes
    const byteX = Math.floor(x / 8)
    const bitX = x & 7

    // move.l #0x3FFFFFFF, D0 (Draw.c:609)
    // This creates a mask with 2 bits cleared: 00 in binary
    // and.w #15, x (Draw.c:608)
    // ror.l x, D0 (Draw.c:610)
    const bitMask = ~(0xc0 >> bitX) & 0xff // Invert to create AND mask

    // Check bounds
    const byteIndex1 = rowOffset + byteX
    const byteIndex2 = rowOffset + result.rowBytes + byteX // Next row

    if (byteIndex1 >= 0 && byteIndex1 < result.data.length) {
      // and.l D0, (A0) (Draw.c:611)
      // First row of the spark - clear bits to make white
      result.data[byteIndex1]! &= bitMask

      // Handle case where spark spans two bytes
      if (bitX >= 7 && byteX + 1 < result.rowBytes) {
        result.data[byteIndex1 + 1]! &= 0x7f // Clear leftmost bit
      }
    }

    if (byteIndex2 >= 0 && byteIndex2 < result.data.length) {
      // and.l D0, 64(A0) (Draw.c:612)
      // Second row of the spark
      result.data[byteIndex2]! &= bitMask

      // Handle case where spark spans two bytes
      if (bitX >= 7 && byteX + 1 < result.rowBytes) {
        result.data[byteIndex2 + 1]! &= 0x7f // Clear leftmost bit
      }
    }

    return result
  }
}