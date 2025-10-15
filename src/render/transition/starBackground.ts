/**
 * @fileoverview Star background - creates a black background with random white stars
 * Corresponds to star_background() in orig/Sources/Play.c:1255-1265
 *
 * Used during planet completion to create the starfield that appears after
 * the fizz transition effect.
 *
 * Refactored to use shared utilities for pixel generation and bitmap conversion.
 */

import type { MonochromeBitmap } from '@lib/bitmap'
import { generateStarmapPixels } from './starmapPixels'
import { starmapPixelsToBitmap } from './starmapToBitmap'

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
 * @returns a screen bitmap
 *
 * @see orig/Sources/Play.c:1255-1265 star_background()
 */
export function starBackground(deps: {
  starCount: number
  additionalRender?: (screen: MonochromeBitmap) => MonochromeBitmap
}): MonochromeBitmap {
  const { starCount, additionalRender } = deps

  // Generate random star coordinates
  const pixels = generateStarmapPixels(starCount)

  // Convert to bitmap with optional additional rendering
  return starmapPixelsToBitmap(pixels, additionalRender)
}
