import type { MonochromeBitmap } from '@/bitmap'
import { BACKGROUND_PATTERNS, SBARHT } from '../screen/constants'

// Constants for collision detection
const SPRITE_WIDTH_PIXELS = 32
const BITS_PER_BYTE = 8

/**
 * Checks if the figure to be drawn will collide with non-background
 * black pixels on the screen.
 *
 * See check-figure() at orig/Source/Draw.c:227-273
 */
export function checkFigure(
  screen: MonochromeBitmap,
  args: {
    x: number
    y: number
    height: number
    /** actual bytes of figure to be drawn (serves the purpose of *def ptr in original code **/
    def: MonochromeBitmap
  }
): boolean {
  const { x, height, def } = args
  
  // Adjust y to account for status bar at top of screen (following orig/Sources/Draw.c:227-273)
  const y = args.y + SBARHT

  // Validate that def is 32 pixels wide
  if (def.width !== SPRITE_WIDTH_PIXELS) {
    throw new Error(`Sprite must be ${SPRITE_WIDTH_PIXELS} pixels wide`)
  }

  // Initialize background mask based on starting y position
  // Use inverse pattern: even rows use BACKGROUND_PATTERNS[1], odd rows use BACKGROUND_PATTERNS[0]
  let backgroundMask: number = BACKGROUND_PATTERNS[1 - (y & 1)] ?? 0x55555555

  // Check each row of the sprite
  for (let row = 0; row < height; row++) {
    const screenY = y + row

    // Skip if row is outside screen bounds
    if (screenY < 0 || screenY >= screen.height) {
      continue
    }

    // Get the 32-bit sprite data for this row
    const spriteRowOffset = row * def.rowBytes
    const spriteData =
      ((def.data[spriteRowOffset] ?? 0) << 24) |
      ((def.data[spriteRowOffset + 1] ?? 0) << 16) |
      ((def.data[spriteRowOffset + 2] ?? 0) << 8) |
      (def.data[spriteRowOffset + 3] ?? 0)

    // Skip this row if sprite has no pixels
    if (spriteData === 0) {
      // Rotate background mask for next row
      backgroundMask = ((backgroundMask >>> 1) | (backgroundMask << 31)) >>> 0
      continue
    }

    // Calculate screen memory position
    const wordBoundaryX = Math.floor(x / 16) * 16
    const screenRowOffset = screenY * screen.rowBytes
    const screenByteOffset = Math.floor(wordBoundaryX / BITS_PER_BYTE)

    // Calculate bit shift for sprite alignment
    const bitShift = x & 15 // x modulo 16

    // Shift sprite data to align with screen position
    const mainData = spriteData >>> bitShift
    const overflowData = (spriteData << (16 - bitShift)) >>> 16

    // Apply background mask to ignore dithered background
    const maskedMain = mainData & backgroundMask
    const maskedOverflow = overflowData & (backgroundMask >>> 0)

    // Check main 32-bit region
    if (maskedMain !== 0) {
      // Read 4 bytes from screen and combine into 32-bit value
      let screenData = 0
      for (let i = 0; i < 4; i++) {
        const byteIndex = screenRowOffset + screenByteOffset + i
        if (byteIndex < screen.data.length) {
          screenData = (screenData << 8) | (screen.data[byteIndex] ?? 0)
        }
      }

      // Check for collision
      if ((maskedMain & screenData) !== 0) {
        return true
      }
    }

    // Check overflow 16-bit region (if within bounds)
    if (maskedOverflow !== 0 && screenByteOffset + 4 < screen.rowBytes) {
      // Read 2 bytes from screen
      let screenOverflow = 0
      for (let i = 0; i < 2; i++) {
        const byteIndex = screenRowOffset + screenByteOffset + 4 + i
        if (byteIndex < screen.data.length) {
          screenOverflow = (screenOverflow << 8) | (screen.data[byteIndex] ?? 0)
        }
      }

      // Check for collision
      if ((maskedOverflow & screenOverflow) !== 0) {
        return true
      }
    }

    // Rotate background mask for next row (rotate right by 1)
    backgroundMask = ((backgroundMask >>> 1) | (backgroundMask << 31)) >>> 0
  }

  return false
}
