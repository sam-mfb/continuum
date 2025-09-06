/**
 * @fileoverview Write message text - displays status messages
 * Based on new_sbar() in orig/Sources/Play.c:1003-1024
 *
 * Writes text messages like "FUEL CRITICAL" or "MISSION COMPLETE".
 */

import { type MonochromeBitmap } from '@lib/bitmap'
import { writeStr } from './writeStr'
import { MESSAGE_X, MESSAGE_Y } from '@core/status/constants'
import type { SpriteServiceV2 } from '@core/sprites/service'

/**
 * Writes a text message at the message area of the status bar.
 *
 * The original displays messages like "FUEL CRITICAL", "OUT OF FUEL",
 * "MISSION COMPLETE", and "AUTOPILOT" at x=8, y=12.
 *
 * @param deps Dependencies object containing:
 *   @param message - Message text to display (null for no message)
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1015 writestr(8, 12, curmessage, screen)
 */
export function writeMessage(deps: {
  message: string | null
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { message, spriteService } = deps

    // If no message, return screen unchanged
    if (!message) {
      return screen
    }

    // Use writeStr at the fixed message position
    return writeStr({
      x: MESSAGE_X,
      y: MESSAGE_Y,
      text: message,
      spriteService
    })(screen)
  }
}
