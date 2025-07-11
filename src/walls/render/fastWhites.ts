/**
 * @fileoverview Corresponds to fast_whites() from orig/Sources/Junctions.c:634
 */

import type { WhiteRec } from '../types'

/**
 * Draws all visible white wall pieces
 * @see orig/Sources/Junctions.c:634 fast_whites()
 */
export const fastWhites = (
  ctx: CanvasRenderingContext2D,
  data: {
    _whites: WhiteRec[]
    screen: { x: number; y: number; b: number; r: number }
    worldwidth: number
  }
): void => {
  /**
   * amount to check to the left of screen for lines that start
   * outside visible area
   */
  const LINE_START_MARGIN = 15
  const top = data.screen.y
  let left = data.screen.x - LINE_START_MARGIN
  const bot = data.screen.b
  let right = data.screen.r

  for (let i = 0; i < 2; i++) {
    // TODO: replicate original assembly

    // account for "donut" worlds
    left -= data.worldwidth
    right -= data.worldwidth
  }
}
