/**
 * @fileoverview Write level number - displays current level at fixed position
 * Based on new_sbar() in orig/Sources/Play.c:1003-1024
 *
 * Writes the current level number at its designated position.
 */

import { type MonochromeBitmap } from '@/bitmap'
import { writeInt } from './writeInt'
import { LEVEL_X, LEVEL_Y } from '@/status/constants'
import type { SpriteServiceV2 } from '@/sprites/service'

/**
 * Writes the level number at its fixed position on the status bar.
 * 
 * The original game writes level at x=456, y=12.
 *
 * @param deps Dependencies object containing:
 *   @param level - Current level number
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1016 writeint(456, 12, currentlevel, screen)
 */
export function writeLevel(deps: {
  level: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { level, spriteService } = deps
    
    // Use writeInt at the fixed level position
    return writeInt({
      x: LEVEL_X,
      y: LEVEL_Y,
      value: level,
      spriteService
    })(screen)
  }
}