/**
 * @fileoverview Clear point - clears a single pixel on the screen
 * Corresponds to clear_point() in orig/Sources/Draw.c:1553-1566
 *
 * Used to create white pixels (stars) on a black background.
 * In Mac monochrome bitmaps, clearing a bit (0) makes it white.
 */

import { cloneBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { SBARHT } from '@core/screen'
import { jsrWAddress } from '@lib/asm/assemblyMacros'

/**
 * Clears a single pixel at the given coordinates.
 *
 * In Mac monochrome format:
 * - 1 bit = black pixel
 * - 0 bit = white pixel
 *
 * So "clearing" a point makes it white, which is used to create stars.
 *
 * @param deps Dependencies object containing:
 *   @param x - X coordinate (0 to screen width - 1)
 *   @param y - Y coordinate in view area (will be offset by SBARHT internally)
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Draw.c:1553-1566 clear_point()
 */
export function clearPoint(deps: {
  x: number
  y: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y } = deps
    const newScreen = cloneBitmap(screen)

    // Add status bar height to move to view area
    // Line 1558: add.w #SBARHT, y
    const adjustedY = y + SBARHT

    // Calculate the byte address using JSR_WADDRESS logic
    // This gives us the starting address for the row
    const baseAddress = jsrWAddress(0, 0, adjustedY)

    // Calculate which byte contains our pixel
    // Each byte contains 8 pixels, so divide x by 8
    const byteOffset = baseAddress + Math.floor(x / 8)

    // Calculate bit position within the byte
    // Line 1561: and.w #15, x (but we only need 0-7 for bit position)
    const bitPosition = x & 7

    // Create the bit mask
    // Line 1562-1563: move.w #0x7FFF, D0; ror.w x, D0
    // 0x7FFF = 0111111111111111 in binary
    // We need to rotate right by bitPosition
    // For a byte operation, we use 0x7F (01111111) instead
    // and rotate to create a mask with a 0 in the target bit position

    // Actually, the original uses word operations but we work with bytes
    // To clear bit at position n (0=leftmost), mask is ~(0x80 >> n)
    const clearMask = ~(0x80 >> bitPosition) & 0xff

    // Apply the mask to clear the bit (AND operation)
    // Line 1564: and.w D0, (A0)
    if (byteOffset < newScreen.data.length) {
      newScreen.data[byteOffset] = newScreen.data[byteOffset]! & clearMask
    }

    return newScreen
  }
}
