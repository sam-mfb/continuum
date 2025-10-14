/**
 * @fileoverview Convert starmap pixel coordinates to MonochromeBitmap
 * Allows bitmap renderer to use shared pixel generator
 *
 * Takes an array of star coordinates and renders them onto a black bitmap,
 * optionally applying additional rendering (like the ship sprite).
 *
 * @see orig/Sources/Play.c:1259-1264 star_background()
 */

import { createGameBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { setScreen } from '@render/screen/setScreen'
import { clearPoint } from '@render/screen/clearPoint'

/**
 * Convert starmap pixel coordinates to a MonochromeBitmap.
 *
 * Creates a black background and places white pixels (stars) at the
 * specified coordinates. Optionally applies additional rendering.
 *
 * @param pixels Array of star coordinates to render
 * @param additionalRender Optional function to render additional content
 *                        (e.g., ship sprite when player is alive)
 * @returns MonochromeBitmap with starmap rendered
 *
 * @see orig/Sources/Play.c:1259-1264
 */
export function starmapPixelsToBitmap(
  pixels: Array<{ x: number; y: number }>,
  additionalRender?: (screen: MonochromeBitmap) => MonochromeBitmap
): MonochromeBitmap {
  const screen = createGameBitmap()

  // Line 1259: set_screen(back_screen, -1L)
  // Fill screen with black (-1L = 0xFFFFFFFF = all bits set = black pixels)
  let result = setScreen({ color: 0xffffffff })(screen)

  // Lines 1260-1261: for (i=0; i<150; i++) clear_point(rint(SCRWTH), rint(VIEWHT))
  // Add white stars by clearing pixels at specified coordinates
  for (const pixel of pixels) {
    result = clearPoint({ x: pixel.x, y: pixel.y })(result)
  }

  // Lines 1262-1264: if (!dead_count) full_figure(...)
  // Apply additional rendering if provided (e.g., ship when not dead)
  if (additionalRender) {
    result = additionalRender(result)
  }

  return result
}
