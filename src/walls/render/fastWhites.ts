/**
 * @fileoverview Corresponds to fast_whites() from orig/Sources/Junctions.c:634
 */

import type { MonochromeBitmap, WhiteRec } from '../types'

/**
 * Draws all visible white wall pieces
 * @see orig/Sources/Junctions.c:634 fast_whites()
 */
export const fastWhites = (
  _screen: MonochromeBitmap,
  data: {
    _whites: WhiteRec[]
    viewport: { x: number; y: number; b: number; r: number }
    worldwidth: number
  }
): void => {
  /**
   * amount to check to the left of screen for lines that start
   * outside visible area
   */
  const LINE_START_MARGIN = 15
  // const _top = data.viewport.y  // TODO: Use for vertical culling
  let left = data.viewport.x - LINE_START_MARGIN
  // const _bot = data.viewport.b  // TODO: Use for vertical culling
  let right = data.viewport.r

  for (let i = 0; i < 2; i++) {
    // TODO: replicate original assembly

    // account for "donut" worlds
    left -= data.worldwidth
    right -= data.worldwidth

    // TODO: Use left and right for culling
  }
}
