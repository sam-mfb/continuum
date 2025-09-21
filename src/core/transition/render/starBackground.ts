/**
 * @fileoverview Star background - creates a black background with random white stars
 * Corresponds to star_background() in orig/Sources/Play.c:1255-1265
 *
 * Used during planet completion to create the starfield that appears after
 * the fizz transition effect.
 */

import type { MonochromeBitmap } from '@lib/bitmap'
import { SCRWTH, VIEWHT } from '@core/screen'
import { rint } from '@core/shared'
import { setScreen } from '@core/screen/render/setScreen'
import { clearPoint } from '@core/screen/render/clearPoint'

/**
 * Creates a star background - black screen with random white stars.
 *
 * The original creates 150 random white pixels (stars) on a black background,
 * then optionally renders the ship if the player is still alive.
 *
 * @param deps Dependencies object containing:
 *   @param starCount - Number of stars to create (default: 150 from original)
 *   @param additionalRender - Optional function to render additional content
 *                            (e.g., full_figure for ship when !dead_count)
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1255-1265 star_background()
 */
export function starBackground(deps?: {
  starCount?: number
  additionalRender?: (screen: MonochromeBitmap) => MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  const starCount = deps?.starCount ?? 150
  const additionalRender = deps?.additionalRender

  return screen => {
    // Line 1259: set_screen(back_screen, -1L)
    // Fill screen with black (-1L = 0xFFFFFFFF = all bits set = black pixels)
    let result = setScreen({ color: 0xffffffff })(screen)

    // Lines 1260-1261: for (i=0; i<150; i++) clear_point(rint(SCRWTH), rint(VIEWHT))
    // Add random white stars by clearing random pixels
    for (let i = 0; i < starCount; i++) {
      const x = rint(SCRWTH)
      const y = rint(VIEWHT)
      result = clearPoint({ x, y })(result)
    }

    // Lines 1262-1264: if (!dead_count) full_figure(...)
    // Apply additional rendering if provided (e.g., ship when not dead)
    if (additionalRender) {
      result = additionalRender(result)
    }

    return result
  }
}
