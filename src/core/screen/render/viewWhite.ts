/**
 * @fileoverview View white implementation - fills view area with white for ship death flash
 * Corresponds to set_screen(front_screen, 0L) in orig/Sources/Terrain.c:413
 *
 * This creates the "obnoxious" white flash effect when the ship explodes.
 * In the original game, 0L meant all bits off, which appeared as white on the inverted display.
 */

import { cloneBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { SBARSIZE } from '@core/screen/constants'

/**
 * Fills the main view area with white (all bits set).
 * Preserves the status bar area unchanged.
 *
 * This implements the screen flash effect from start_death() in Terrain.c:413
 * where set_screen(front_screen, 0L) fills the viewport with white.
 * The comment "this is obnoxious!" suggests this was a deliberate jarring effect.
 *
 * @returns Pure function that transforms a screen bitmap to all white (except status bar)
 *
 * @see orig/Sources/Terrain.c:413 start_death() - set_screen(front_screen, 0L)
 * @see orig/Sources/Draw.c:1392-1406 set_screen() - fills viewport with color
 */
export function viewWhite(): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const newScreen = cloneBitmap(screen)

    // Fill everything after the status bar with white (all bits cleared to 0)
    // In our bitmap format, 0x00 = all bits clear = all pixels white/off
    // This matches the original's set_screen(front_screen, 0L) where 0L meant white
    for (let i = SBARSIZE; i < newScreen.data.length; i++) {
      newScreen.data[i] = 0x00
    }

    return newScreen
  }
}
