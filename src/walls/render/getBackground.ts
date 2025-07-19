/**
 * @fileoverview Implements the background pattern swapping logic from view_clear()
 *
 * The original C code swaps background patterns based on viewport position to ensure
 * that each world position always gets the same pattern regardless of viewport offset.
 */

import { BACKGROUND_PATTERNS } from '../../screen/constants'

/**
 * Gets the appropriate background pattern for a given screen coordinate,
 * implementing the same swapping logic as the original C code's view_clear() function.
 *
 * @param x - Screen x coordinate
 * @param y - Screen y coordinate
 * @param scrx - Viewport x offset (screenx in original)
 * @param scry - Viewport y offset (screeny in original)
 * @returns The background pattern array with patterns swapped based on viewport position
 */
export function getBackground(
  x: number,
  y: number,
  scrx: number,
  scry: number
): readonly [number, number] {
  // Original C code from view_clear():
  // if ((screenx + screeny) & 1) {
  //     bgr1 = backgr2;
  //     bgr2 = backgr1;
  // } else {
  //     bgr1 = backgr1;
  //     bgr2 = backgr2;
  // }
  // background[0] = bgr1;
  // background[1] = bgr2;

  const shouldSwap = (scrx + scry) & 1

  if (shouldSwap) {
    // Swap the patterns
    return [BACKGROUND_PATTERNS[1], BACKGROUND_PATTERNS[0]]
  } else {
    // Keep original order
    return BACKGROUND_PATTERNS
  }
}
