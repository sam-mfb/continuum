/**
 * @fileoverview Complete status bar redraw - renders entire status bar
 * Corresponds to new_sbar() in orig/Sources/Play.c:1003-1024
 *
 * Performs a complete redraw of the status bar with all fields.
 */

import { type MonochromeBitmap } from '@lib/bitmap'
import { sbarClear } from './sbarClear'
import { writeLives } from './writeLives'
import { writeMessage } from './writeMessage'
import { writeLevel } from './writeLevel'
import { writeScore } from './writeScore'
import { writeFuel } from './writeFuel'
import { writeBonus } from './writeBonus'
import type { SpriteServiceV2 } from '@core/sprites/service'

/**
 * Performs a complete redraw of the status bar.
 *
 * The original clears the status bar then writes all fields:
 * - Ship lives icons
 * - Current message (if any)
 * - Level number
 * - Score
 * - Fuel
 * - Bonus
 *
 * This is called when major changes occur like new ship, level change,
 * or status message changes.
 *
 * @param deps Dependencies object containing:
 *   @param lives - Number of ship lives to display
 *   @param message - Current message text (null for none)
 *   @param level - Current level number
 *   @param score - Current score
 *   @param fuel - Current fuel amount
 *   @param bonus - Current planet bonus
 *   @param spriteService - Service providing sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1003-1024 new_sbar()
 */
export function newSbar(deps: {
  lives: number
  message: string | null
  level: number
  score: number
  fuel: number
  bonus: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { lives, message, level, score, fuel, bonus, spriteService } = deps
    const statusBarTemplate = spriteService.getStatusBarTemplate()

    // Start with a clean status bar
    let result = sbarClear({ statusBarTemplate })(screen)

    // Draw ship lives (top row, left side)
    result = writeLives({ lives, spriteService })(result)

    // Draw current message (bottom row, left side)
    result = writeMessage({ message, spriteService })(result)

    // Draw level (bottom row, right side)
    result = writeLevel({ level, spriteService })(result)

    // The original calls score_plus(0), fuel_minus(0), and write_bonus()
    // to write these values after the main loop

    // Draw score (bottom row, variable position)
    result = writeScore({ score, spriteService })(result)

    // Draw fuel (bottom row, middle)
    result = writeFuel({ fuel, spriteService })(result)

    // Draw bonus (bottom row, middle-right)
    result = writeBonus({ bonus, spriteService })(result)

    return result
  }
}
