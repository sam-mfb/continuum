/**
 * @fileoverview Incremental status bar update - updates changing fields
 * Corresponds to update_sbar() in orig/Sources/Play.c:1027-1034
 *
 * Updates frequently changing status bar fields without full redraw.
 */

import { type MonochromeBitmap } from '@/bitmap'
import { writeFuel } from './writeFuel'
import type { SpriteServiceV2 } from '@/sprites/service'

/**
 * Performs an incremental update of frequently changing status bar fields.
 * 
 * The original only updates fuel when fuelold > 0, writing it to
 * the front screen. This is called during the game loop to update
 * values that change frequently without doing a full redraw.
 * 
 * We can extend this to support other frequently changing fields
 * as needed, using null to indicate "don't update this field".
 *
 * @param deps Dependencies object containing:
 *   @param fuel - Current fuel amount (null to skip update)
 *   @param spriteService - Service providing sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1027-1034 update_sbar()
 */
export function updateSbar(deps: {
  fuel: number | null
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { fuel, spriteService } = deps
    
    let result = screen
    
    // Update fuel if provided
    // Original: if (fuelold) { writeint(296, 12, fuel, front_screen); }
    if (fuel !== null) {
      result = writeFuel({ fuel, spriteService })(result)
    }
    
    // Could extend to update other fields as needed:
    // - Score (if it changes frequently)
    // - Bonus (as it counts down)
    // But the original only updates fuel
    
    return result
  }
}