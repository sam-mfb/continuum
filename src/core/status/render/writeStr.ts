/**
 * @fileoverview Write string implementation - writes text on status bar
 * Corresponds to writestr() in orig/Sources/Play.c:1078-1092
 *
 * Writes uppercase text strings left-to-right on the status bar.
 */

import { type MonochromeBitmap } from '@lib/bitmap'
import { drawDigit } from './drawDigit'
import type { SpriteServiceV2 } from '@core/sprites'

/**
 * Writes a text string on the status bar.
 *
 * The original only handles uppercase A-Z characters, converting
 * them to digit indices (A = ACHAR = 10, B = 11, etc.).
 * Non-alphabetic characters are skipped.
 *
 * @param deps Dependencies object containing:
 *   @param x - Starting X position
 *   @param y - Y position
 *   @param text - Text string to write (will be converted to uppercase)
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1078-1092 writestr()
 */
export function writeStr(deps: {
  x: number
  y: number
  text: string
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, text, spriteService } = deps
    const statusBarTemplate = spriteService.getStatusBarTemplate()

    if (!text) {
      return screen // Original returns early for null message
    }

    let result = screen
    let currentX = x

    // Process each character in the string
    for (const char of text) {
      const upperChar = char.toUpperCase()

      // Process A-Z characters and spaces
      // The original only handles A-Z, but we'll add space for better usability
      if (upperChar >= 'A' && upperChar <= 'Z') {
        const digitSprite = spriteService.getDigitSprite(upperChar)

        if (digitSprite) {
          result = drawDigit({
            x: currentX,
            y,
            digitSprite: digitSprite.bitmap,
            statusBarTemplate
          })(result)
        }

        currentX += 8 // Move to next character position
      } else if (char === ' ') {
        // Handle space character
        const spaceSprite = spriteService.getDigitSprite(' ')

        if (spaceSprite) {
          result = drawDigit({
            x: currentX,
            y,
            digitSprite: spaceSprite.bitmap,
            statusBarTemplate
          })(result)
        }

        currentX += 8 // Move to next character position
      }
      // Other non-alphabetic characters are skipped (no x increment)
      // This mostly matches the original behavior but adds space support
    }

    return result
  }
}
