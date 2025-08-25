/**
 * @fileoverview Write fuel value - displays fuel at fixed position
 * Based on update_sbar() in orig/Sources/Play.c:1027-1034
 *
 * Writes the fuel value at its designated position on the status bar.
 */

import { type MonochromeBitmap } from '@/bitmap'
import { writeInt } from './writeInt'
import { FUEL_X, FUEL_Y } from '@/status/constants'
import type { SpriteServiceV2 } from '@/sprites/service'

/**
 * Writes the fuel value at its fixed position on the status bar.
 *
 * The original game writes fuel at x=296, y=12 during update_sbar().
 *
 * @param deps Dependencies object containing:
 *   @param fuel - Current fuel value
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1032 writeint(296, 12, fuel, front_screen)
 */
export function writeFuel(deps: {
  fuel: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { fuel, spriteService } = deps

    // Use writeInt at the fixed fuel position
    return writeInt({
      x: FUEL_X,
      y: FUEL_Y,
      value: fuel,
      spriteService
    })(screen)
  }
}
