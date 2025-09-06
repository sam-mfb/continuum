import type { MonochromeBitmap } from '@lib/bitmap'
import { cloneBitmap } from '@lib/bitmap'
import { SBARHT } from '@core/screen'

/**
 * Draw a 2x2 black dot on the screen (used for bunker shots)
 * From orig/Sources/Draw.c at draw_dot_safe():579-593
 *
 * This function draws a 2x2 pixel dot at the specified position.
 * In the original, it uses OR operations to set bits (creating black dots).
 * The dot spans two rows and two bits horizontally.
 *
 * @param x - Screen x coordinate (0-based, relative to viewport)
 * @param y - Screen y coordinate (0-based, relative to viewport)
 * @param screen - The bitmap to draw on
 * @returns Modified bitmap with the dot drawn
 */
export function drawDotSafe(
  x: number,
  y: number,
  screen: MonochromeBitmap
): MonochromeBitmap {
  // Clone the bitmap to ensure immutability
  const result = cloneBitmap(screen)

  // add.w #SBARHT, y /* move to view area */ (Draw.c:584)
  const adjustedY = y + SBARHT

  // Calculate byte position in screen buffer
  // FIND_WADDRESS(x, y) (Draw.c:586)
  const rowOffset = adjustedY * result.rowBytes
  const byteX = Math.floor(x / 8)
  const bitX = x & 7

  // move.l #0xC0000000, D0 (Draw.c:588)
  // This is a 2-bit pattern: 11 in binary
  // and.w #15, x (Draw.c:587)
  // ror.l x, D0 (Draw.c:589)
  const bitMask = 0xc0 >> bitX // 11000000 shifted right by bit position

  // Check bounds
  const byteIndex1 = rowOffset + byteX
  const byteIndex2 = rowOffset + result.rowBytes + byteX // Next row (64 bytes in original)

  if (byteIndex1 >= 0 && byteIndex1 < result.data.length) {
    // or.l D0, (A0) (Draw.c:590)
    // First row of the dot
    result.data[byteIndex1]! |= bitMask

    // Handle case where dot spans two bytes
    if (bitX >= 7 && byteX + 1 < result.rowBytes) {
      result.data[byteIndex1 + 1]! |= 0x80 // Leftmost bit
    }
  }

  if (byteIndex2 >= 0 && byteIndex2 < result.data.length) {
    // or.l D0, 64(A0) (Draw.c:591)
    // Second row of the dot
    result.data[byteIndex2]! |= bitMask

    // Handle case where dot spans two bytes
    if (bitX >= 7 && byteX + 1 < result.rowBytes) {
      result.data[byteIndex2 + 1]! |= 0x80 // Leftmost bit
    }
  }

  return result
}
