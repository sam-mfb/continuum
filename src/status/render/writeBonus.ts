/**
 * @fileoverview Write bonus value - displays planet bonus at fixed position
 * Based on write_bonus() in orig/Sources/Play.c:952-956
 *
 * Writes the planet bonus value at its designated position.
 */

import { type MonochromeBitmap } from '@/bitmap'
import { writeInt } from './writeInt'
import { BONUS_X, BONUS_Y } from '@/status/constants'
import type { SpriteServiceV2 } from '@/sprites/service'

/**
 * Writes the planet bonus value at its fixed position on the status bar.
 *
 * The original game writes bonus at x=384, y=12.
 *
 * @param deps Dependencies object containing:
 *   @param bonus - Current planet bonus value
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:954 writeint(384, 12, planetbonus, back_screen)
 */
export function writeBonus(deps: {
  bonus: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { bonus, spriteService } = deps

    // Use writeInt at the fixed bonus position
    return writeInt({
      x: BONUS_X,
      y: BONUS_Y,
      value: bonus,
      spriteService
    })(screen)
  }
}
