/**
 * @fileoverview Status bar clear implementation - restores clean status bar
 * Corresponds to sbar_clear() in orig/Sources/Draw.c:1409-1419
 *
 * Copies the clean status bar template to the screen, resetting it for
 * drawing status information (ships, score, level).
 */

import { cloneBitmap, type MonochromeBitmap } from '@/bitmap'
import { SBARSIZE } from '@/screen/constants'

/**
 * Restores the status bar from a clean template.
 *
 * This function is called before updating status bar content to reset it
 * to a clean state. The template contains the background pattern/graphics
 * for the status bar area.
 *
 * Used in:
 * - update_sbar() to refresh status display each frame
 * - clear_screen() when clearing the entire screen
 *
 * @param deps Dependencies object containing:
 *   @param statusBarTemplate - The clean status bar bitmap to copy from
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Draw.c:1409-1419 sbar_clear()
 * @see orig/Sources/Play.c:1010 usage in update_sbar()
 * @see orig/Sources/Play.c:1099 usage in clear_screen()
 */
export function sbarClear(deps: {
  statusBarTemplate: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { statusBarTemplate } = deps
    const newScreen = cloneBitmap(screen)

    // The original assembly:
    // move.w #SBARSIZE/4-1, D1
    // @loop move.l (sbardata)+, (screen)+
    // dbf D1, @loop
    //
    // This copies SBARSIZE bytes from the template to the screen
    // using 32-bit (4-byte) moves for efficiency

    // Copy the status bar area from template to screen
    const bytesToCopy = Math.min(SBARSIZE, statusBarTemplate.data.length)

    for (let i = 0; i < bytesToCopy && i < newScreen.data.length; i++) {
      newScreen.data[i] = statusBarTemplate.data[i]!
    }

    return newScreen
  }
}

/**
 * Optimized version using typed array set() for better performance
 */
export function sbarClearOptimized(deps: {
  statusBarTemplate: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { statusBarTemplate } = deps
    const newScreen = cloneBitmap(screen)

    // Use set() for more efficient bulk copy
    const bytesToCopy = Math.min(
      SBARSIZE,
      statusBarTemplate.data.length,
      newScreen.data.length
    )

    if (bytesToCopy > 0) {
      // Copy the entire status bar area at once
      newScreen.data.set(statusBarTemplate.data.subarray(0, bytesToCopy), 0)
    }

    return newScreen
  }
}
