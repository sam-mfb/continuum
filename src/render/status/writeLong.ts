/**
 * @fileoverview Write long integer implementation - writes long integers on status bar
 * Corresponds to writelong() in orig/Sources/Play.c:1037-1048
 *
 * Writes long integers right-aligned at a specified position.
 */

import { type MonochromeBitmap } from '@lib/bitmap'
import { drawDigit } from './drawDigit'
import type { SpriteService } from '@core/sprites'

/**
 * Writes a long integer right-aligned at the specified position.
 *
 * Similar to writeInt but handles larger numbers. The original
 * uses a do-while loop to process digits from right to left.
 *
 * @param deps Dependencies object containing:
 *   @param x - X position for rightmost digit
 *   @param y - Y position
 *   @param value - Long integer value to write
 *   @param spriteService - Service providing digit sprites and status bar template
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Play.c:1037-1048 writelong()
 */
export function writeLong(deps: {
  x: number
  y: number
  value: number
  spriteService: SpriteService
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, value, spriteService } = deps
    const statusBarTemplate = spriteService.getStatusBarTemplate()

    let result = screen
    let n = Math.abs(value) // Handle negative numbers
    let currentX = x

    // Process digits from right to left (same as writeInt)
    // The original uses a do-while loop
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

    // Clear extra digit position with SPACECHAR
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
