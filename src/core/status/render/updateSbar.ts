/**
 * @fileoverview Incremental status bar update - updates changing fields
 * Corresponds to update_sbar() in orig/Sources/Play.c:1027-1034
 *
 * Updates frequently changing status bar fields without full redraw.
 */

import { type MonochromeBitmap } from '@lib/bitmap'
import { writeFuel } from './writeFuel'
import { writeLives } from './writeLives'
import { writeScore } from './writeScore'
import { writeBonus } from './writeBonus'
import { writeLevel } from './writeLevel'
import { writeMessage } from './writeMessage'
import type { SpriteServiceV2 } from '@core/sprites'

/**
 * Performs an incremental update of frequently changing status bar fields.
 *
 * The original only updates fuel when fuelold > 0, writing it to
 * the front screen. This is called during the game loop to update
 * values that change frequently without doing a full redraw.
 *
 * We extend this to support all status bar fields for the refactoring
 * where status bar is rendered at the orchestration level.
 *
 * @param deps Dependencies object containing:
 *   @param fuel - Current fuel amount
 *   @param lives - Number of ship lives
 *   @param score - Current score
 *   @param bonus - Current planet bonus
 *   @param level - Current level number
 *   @param message - Current message text (null for none)
 *   @param spriteService - Service providing sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1027-1034 update_sbar()
 */
export function updateSbar(deps: {
  fuel: number
  lives: number
  score: number
  bonus: number
  level: number
  message: string | null
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { fuel, lives, score, bonus, level, message, spriteService } = deps

    let result = screen

    // Update all fields
    result = writeFuel({ fuel, spriteService })(result)
    result = writeLives({ lives, spriteService })(result)
    result = writeScore({ score, spriteService })(result)
    result = writeBonus({ bonus, spriteService })(result)
    result = writeLevel({ level, spriteService })(result)
    result = writeMessage({ message, spriteService })(result)

    return result
  }
}
