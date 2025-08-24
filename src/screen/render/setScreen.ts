/**
 * @fileoverview Set screen implementation - fills view area with solid color
 * Corresponds to set_screen() in orig/Sources/Draw.c:1392-1406
 *
 * Used for special effects like death white-out and black star background.
 */

import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARSIZE, VIEWSIZE } from '@/screen/constants'

/**
 * Fills the view area with a solid color.
 *
 * In Mac monochrome:
 * - 1 bits = black pixels
 * - 0 bits = white pixels
 *
 * Common uses:
 * - star_background() calls with -1L (0xFFFFFFFF) to create black background
 * - start_death() calls with 0L (0x00000000) to white out screen
 *
 * @param deps Dependencies object containing:
 *   @param color - 32-bit color value to fill with
 *                  0xFFFFFFFF (-1) for black, 0x00000000 (0) for white
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Draw.c:1392-1406 set_screen()
 */
export function setScreen(deps: {
  color: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { color } = deps
    const newScreen = cloneBitmap(screen)

    // The original assembly:
    // - Starts at screen + SBARSIZE (skips status bar)
    // - Writes VIEWSIZE/4 longwords (32-bit values)
    // - Uses a simple MOVE.L loop

    // Convert color to bytes (big-endian)
    const bytes = new Uint8Array(4)
    bytes[0] = (color >>> 24) & 0xff
    bytes[1] = (color >>> 16) & 0xff
    bytes[2] = (color >>> 8) & 0xff
    bytes[3] = color & 0xff

    // Start after status bar
    let offset = SBARSIZE

    // Fill the view area
    // VIEWSIZE/4 = number of 32-bit words to write
    const numLongwords = VIEWSIZE / 4

    for (let i = 0; i < numLongwords; i++) {
      // Write 4 bytes at once
      if (offset + 3 < newScreen.data.length) {
        newScreen.data[offset] = bytes[0]!
        newScreen.data[offset + 1] = bytes[1]!
        newScreen.data[offset + 2] = bytes[2]!
        newScreen.data[offset + 3] = bytes[3]!
      }
      offset += 4
    }

    return newScreen
  }
}

/**
 * Optimized version using typed array set() for better performance
 */
export function setScreenOptimized(deps: {
  color: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { color } = deps
    const newScreen = cloneBitmap(screen)

    // Create a 4-byte pattern
    const pattern = new Uint8Array(4)
    pattern[0] = (color >>> 24) & 0xff
    pattern[1] = (color >>> 16) & 0xff
    pattern[2] = (color >>> 8) & 0xff
    pattern[3] = color & 0xff

    // Fill using set() for better performance
    let offset = SBARSIZE
    const endOffset = SBARSIZE + VIEWSIZE

    while (offset < endOffset && offset < newScreen.data.length) {
      newScreen.data.set(pattern, offset)
      offset += 4
    }

    return newScreen
  }
}
