/**
 * @fileoverview Shared starmap pixel generator
 * Extracted from starBackground.ts for reuse by both bitmap and frame renderers
 *
 * Generates random star coordinates for starmap backgrounds used during
 * planet completion transitions.
 *
 * @see orig/Sources/Play.c:1260-1261 star_background()
 */

import { SCRWTH, VIEWHT } from '@core/screen'
import { rint } from '@core/shared'

/**
 * Generate random star coordinates for starmap background.
 *
 * Creates an array of random (x, y) coordinates that can be used to
 * render stars on either a MonochromeBitmap or Frame.
 *
 * @param starCount Number of stars to generate (original uses 150)
 * @returns Array of pixel coordinates for star positions
 *
 * @see orig/Sources/Play.c:1260-1261
 */
export function generateStarmapPixels(
  starCount: number
): Array<{ x: number; y: number }> {
  const pixels: Array<{ x: number; y: number }> = []

  // Lines 1260-1261: for (i=0; i<150; i++) clear_point(rint(SCRWTH), rint(VIEWHT))
  // Generate random star positions
  for (let i = 0; i < starCount; i++) {
    const x = rint(SCRWTH)
    const y = rint(VIEWHT)
    pixels.push({ x, y })
  }

  return pixels
}
