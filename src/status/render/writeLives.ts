/**
 * @fileoverview Write ship lives - displays ship icons for remaining lives
 * Based on new_sbar() in orig/Sources/Play.c:1003-1024
 *
 * Draws ship icons to represent remaining lives.
 */

import { type MonochromeBitmap } from '@/bitmap'
import { drawDigit } from './drawDigit'
import { LIVES_START_X, LIVES_Y, LIVES_SPACING } from '@/status/constants'
import type { SpriteServiceV2 } from '@/sprites/service'

/**
 * Draws ship icons to represent the number of remaining lives.
 *
 * The original draws SHIPCHAR sprites starting at x=8, y=0,
 * spaced 8 pixels apart.
 *
 * @param deps Dependencies object containing:
 *   @param lives - Number of ship lives to display
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1012-1013 for loop drawing SHIPCHAR
 */
export function writeLives(deps: {
  lives: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { lives, spriteService } = deps
    const statusBarTemplate = spriteService.getStatusBarTemplate()

    let result = screen
    let pos = LIVES_START_X

    // Draw ship icons for each life
    // Original: for(i=0, pos=8; i < numships && pos < 150; i++, pos+=8)
    const shipSprite = spriteService.getDigitSprite('SHIP')

    if (shipSprite) {
      for (let i = 0; i < lives && pos < 150; i++, pos += LIVES_SPACING) {
        result = drawDigit({
          x: pos,
          y: LIVES_Y,
          digitSprite: shipSprite.bitmap,
          statusBarTemplate
        })(result)
      }
    }

    return result
  }
}
