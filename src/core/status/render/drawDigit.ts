/**
 * @fileoverview Draw digit implementation - draws digits/characters on status bar
 * Corresponds to draw_digit() in orig/Sources/Draw.c:672-710
 *
 * Draws 8x9 pixel characters on the status bar using XOR operation
 * to preserve the background pattern.
 */

import { cloneBitmap, type MonochromeBitmap } from '@lib/bitmap'
import { DIGHEIGHT } from '@core/status/constants'

/**
 * Draws a single digit or character on the status bar.
 *
 * The original uses XOR to draw digits on top of the status bar background,
 * allowing the background pattern to show through. This is used for:
 * - Score display (digits 0-9)
 * - Level display (digits 0-9)
 * - Ship lives display (SHIPCHAR)
 * - Text messages (A-Z characters)
 * - Clearing spaces (SPACECHAR)
 *
 * @param deps Dependencies object containing:
 *   @param x - X position in pixels (will be aligned to byte boundary)
 *   @param y - Y position in pixels within status bar
 *   @param digitSprite - MonochromeBitmap containing the digit bitmap (8x9 pixels)
 *   @param statusBarTemplate - The clean status bar bitmap to XOR against
 * @returns Pure function that transforms a screen bitmap
 *
 * @see orig/Sources/Draw.c:672-710 draw_digit()
 */
export function drawDigit(deps: {
  x: number
  y: number
  digitSprite: MonochromeBitmap
  statusBarTemplate: MonochromeBitmap
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { x, y, digitSprite, statusBarTemplate } = deps
    const newScreen = cloneBitmap(screen)

    // The original assembly:
    // - Shifts y left by 6 (multiply by 64) for row offset
    // - Shifts x right by 3 (divide by 8) for byte offset
    // - Processes 3 rows at a time in the loop (DIGHEIGHT/3 iterations)

    // Calculate byte offset from x position
    // asr.w #3, x - convert pixel x to byte offset
    const byteX = Math.floor(x / 8)

    // Calculate row offset
    // asl.w #6, y - multiply y by 64 (bytes per row)
    const rowOffset = y * 64

    // Calculate starting positions in both buffers
    let screenOffset = rowOffset + byteX
    let templateOffset = rowOffset + byteX

    // Process the digit in groups of 3 rows
    // moveq #DIGHEIGHT/3-1, D2 - loop counter
    const iterations = Math.floor(DIGHEIGHT / 3)
    let spriteIndex = 0

    for (let i = 0; i < iterations; i++) {
      // Process 3 rows in each iteration
      for (let row = 0; row < 3; row++) {
        const currentScreenOffset = screenOffset + row * 64
        const currentTemplateOffset = templateOffset + row * 64

        if (
          currentScreenOffset < newScreen.data.length &&
          currentTemplateOffset < statusBarTemplate.data.length &&
          spriteIndex < digitSprite.data.length
        ) {
          // Get the template byte
          // move.b (A0), D0
          const templateByte =
            statusBarTemplate.data[currentTemplateOffset] || 0

          // Get the sprite byte
          // move.b (def)+, D1
          const spriteByte = digitSprite.data[spriteIndex] || 0

          // XOR template with sprite
          // eor.b D1, D0
          const resultByte = templateByte ^ spriteByte

          // Write to screen
          // move.b D0, (screen)
          newScreen.data[currentScreenOffset] = resultByte
        }

        spriteIndex++
      }

      // Move to next group of 3 rows
      // adda.l y, A0 (where y = 64*3 = 192)
      screenOffset += 64 * 3
      templateOffset += 64 * 3
    }

    return newScreen
  }
}
