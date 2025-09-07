/**
 * @fileoverview View clear implementation - fills view area with alternating gray pattern
 * Corresponds to view_clear() in orig/Sources/Draw.c:1422-1518
 *
 * This is the most frequently called function in the game (18.1% of runtime)
 * It creates the dithered gray background pattern before drawing game objects.
 */

import { cloneBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { SBARSIZE, VIEWHT } from '@core/screen'
import { getAlignment } from '@core/shared'
import { getBackgroundPattern } from '@core/shared'

/**
 * Fills the main view area with alternating gray pattern.
 * Creates the dithered checkerboard background that is characteristic of the game.
 *
 * The pattern alternates every scanline based on viewport position to create
 * a stable diagonal checkerboard pattern as the viewport moves through the world.
 *
 * The original uses highly optimized MOVEM.L instructions to write 10 registers
 * (40 bytes) at once, achieving the 18.1% runtime performance.
 *
 * @param deps Dependencies object containing:
 *   @param screenX - X position of viewport in world coordinates
 *   @param screenY - Y position of viewport in world coordinates
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Draw.c:1422-1518 view_clear()
 */
export function viewClear(deps: {
  screenX: number
  screenY: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { screenX, screenY } = deps
    const newScreen = cloneBitmap(screen)

    // Calculate which patterns to use based on screen position
    // This creates the diagonal checkerboard effect
    // Lines 1429-1440 in Draw.c
    // Use getAlignment to support both world-fixed and screen-fixed modes
    // In world-fixed mode, we want the pattern to change based on viewport position
    // In screen-fixed mode, we want a constant pattern
    const screenAlignment = getAlignment({
      x: screenX,  // Use viewport position as world coordinates
      y: screenY,
      screenX,
      screenY
    })

    // Get the two background patterns
    // When screenAlignment is 0: bgr1 = pattern0, bgr2 = pattern1
    // When screenAlignment is 1: bgr1 = pattern1, bgr2 = pattern0 (swapped)
    const bgr1 = getBackgroundPattern(screenAlignment)
    const bgr2 = getBackgroundPattern((screenAlignment ^ 1) as 0 | 1)

    // The original uses MOVEM to write multiple registers at once for speed
    // We'll simulate this by writing 4-byte chunks
    // The pattern alternates every 2 scanlines (128 bytes = 2 * 64 bytes/row)

    // Start from the status bar end (skip status bar)
    let offset = SBARSIZE

    // The original writes from bottom to top using MOVEM with pre-decrement
    // but we'll write top to bottom for simplicity (same result)

    // Calculate how many scanlines to fill
    const scanlines = VIEWHT

    // Process each scanline
    for (let line = 0; line < scanlines; line++) {
      // Determine which pattern to use for this line
      // Lines alternate between bgr1 and bgr2
      const pattern = (line & 1) === 0 ? bgr1 : bgr2

      // Convert pattern to bytes (big-endian)
      const bytes = [
        (pattern >>> 24) & 0xff,
        (pattern >>> 16) & 0xff,
        (pattern >>> 8) & 0xff,
        pattern & 0xff
      ]

      // Fill this scanline (64 bytes = 16 * 4-byte pattern)
      for (let i = 0; i < 16; i++) {
        // Write 4 bytes of pattern
        for (let j = 0; j < 4; j++) {
          if (offset + j < newScreen.data.length) {
            newScreen.data[offset + j] = bytes[j]!
          }
        }
        offset += 4
      }
    }

    return newScreen
  }
}

/**
 * Optimized version using larger writes to simulate MOVEM.L
 * This more closely matches the original's performance characteristics.
 */
export function viewClearOptimized(deps: {
  screenX: number
  screenY: number
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { screenX, screenY } = deps
    const newScreen = cloneBitmap(screen)

    // Calculate pattern alignment using getAlignment for mode support
    const screenAlignment = getAlignment({
      x: screenX,  // Use viewport position as world coordinates
      y: screenY,
      screenX,
      screenY
    })
    const bgr1 = getBackgroundPattern(screenAlignment)
    const bgr2 = getBackgroundPattern((screenAlignment ^ 1) as 0 | 1)

    // Create byte arrays for each pattern
    const pattern1Bytes = new Uint8Array(4)
    const pattern2Bytes = new Uint8Array(4)

    pattern1Bytes[0] = (bgr1 >>> 24) & 0xff
    pattern1Bytes[1] = (bgr1 >>> 16) & 0xff
    pattern1Bytes[2] = (bgr1 >>> 8) & 0xff
    pattern1Bytes[3] = bgr1 & 0xff

    pattern2Bytes[0] = (bgr2 >>> 24) & 0xff
    pattern2Bytes[1] = (bgr2 >>> 16) & 0xff
    pattern2Bytes[2] = (bgr2 >>> 8) & 0xff
    pattern2Bytes[3] = bgr2 & 0xff

    // The original uses MOVEM to write 40 bytes at once (10 registers * 4 bytes)
    // It processes 12 scanlines in each loop iteration (6 pairs of scanlines)
    // Each pair uses alternating patterns

    let offset = SBARSIZE
    const bytesPerLine = 64

    // Main loop processes blocks of 12 scanlines
    // Original: move.w #(VIEWHT-6)/12-1, (SP) = (318-6)/12-1 = 25 iterations
    const mainIterations = Math.floor((VIEWHT - 6) / 12)

    for (let iter = 0; iter < mainIterations; iter++) {
      // Each iteration fills 12 scanlines (6 pairs)
      for (let pair = 0; pair < 6; pair++) {
        // First line of pair uses pattern1
        for (let i = 0; i < bytesPerLine / 4; i++) {
          newScreen.data.set(pattern1Bytes, offset)
          offset += 4
        }

        // Second line of pair uses pattern2
        for (let i = 0; i < bytesPerLine / 4; i++) {
          newScreen.data.set(pattern2Bytes, offset)
          offset += 4
        }
      }
    }

    // Handle remaining 6 scanlines
    // Original lines 1499-1513
    for (let line = 0; line < 6; line++) {
      const patternBytes = (line & 1) === 0 ? pattern1Bytes : pattern2Bytes
      for (let i = 0; i < bytesPerLine / 4; i++) {
        newScreen.data.set(patternBytes, offset)
        offset += 4
      }
    }

    return newScreen
  }
}
