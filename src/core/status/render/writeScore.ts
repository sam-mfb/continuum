/**
 * @fileoverview Write score value - displays score with variable position
 * Based on score_plus() in orig/Sources/Play.c:993-1000
 *
 * Writes the score value with position varying based on score magnitude.
 */

import { type MonochromeBitmap } from '@lib/bitmap'
import { writeLong } from './writeLong'
import { SCORE_Y, SCORE_X_NORMAL, SCORE_X_LARGE } from '@core/status'
import type { SpriteService } from '@core/sprites'

/**
 * Writes the score value at a position that varies based on magnitude.
 *
 * The original adjusts the x position based on whether the score
 * is less than 1,000,000 (x=216) or greater (x=224).
 *
 * @param deps Dependencies object containing:
 *   @param score - Current score value
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:997 scpos = score < 1000000 ? 216 : 224
 */
export function writeScore(deps: {
  score: number
  spriteService: SpriteService
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { score, spriteService } = deps

    // Determine x position based on score magnitude
    const x = score < 1000000 ? SCORE_X_NORMAL : SCORE_X_LARGE

    // Use writeLong at the calculated position
    return writeLong({
      x,
      y: SCORE_Y,
      value: score,
      spriteService
    })(screen)
  }
}
