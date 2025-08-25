/**
 * @fileoverview Write integer implementation - writes integers on status bar
 * Corresponds to writeint() in orig/Sources/Play.c:1051-1075
 *
 * Writes integers right-aligned at a specified position, clearing
 * any leftover digits with a space character.
 */

import { type MonochromeBitmap } from '@/bitmap'
import { drawDigit } from './drawDigit'
import type { SpriteServiceV2 } from '@/sprites/service'

/**
 * Writes an integer right-aligned at the specified position.
 *
 * The original assembly code processes digits from right to left,
 * writing each digit and then clearing the leftmost position with
 * a space to handle shrinking numbers (e.g., 100 -> 99).
 *
 * @param deps Dependencies object containing:
 *   @param x - X position for rightmost digit
 *   @param y - Y position
 *   @param value - Integer value to write
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1051-1075 writeint()
 */
export function writeInt(deps: {
  x: number
  y: number
  value: number
  spriteService: SpriteServiceV2
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, value, spriteService } = deps
    const statusBarTemplate = spriteService.getStatusBarTemplate()

    let result = screen
    let n = Math.abs(value) // Handle negative numbers
    let currentX = x

    // The original processes digits right to left using divs/swap instructions
    // We'll do the same - extract digits and draw from right to left
    do {
      const digit = n % 10
      const digitSprite = spriteService.getDigitSprite(digit.toString())

      if (digitSprite) {
        result = drawDigit({
          x: currentX,
          y,
          digitSprite: digitSprite.bitmap,
          statusBarTemplate
        })(result)
      }

      n = Math.floor(n / 10)
      currentX -= 8
    } while (n > 0 && currentX >= 0)

    // Clear the leftmost position with SPACECHAR (like the original)
    // This handles cases where the number shrinks (e.g., 100 -> 99)
    const spaceSprite = spriteService.getDigitSprite(' ')
    if (spaceSprite && currentX >= 0) {
      result = drawDigit({
        x: currentX,
        y,
        digitSprite: spaceSprite.bitmap,
        statusBarTemplate
      })(result)
    }

    return result
  }
}
