/**
 * Simple bitmap test game that displays a gray pattern
 */

import type { BitmapRenderer } from '../../bitmap'
import { setPixel, clearPixel } from '../../bitmap'

/**
 * Creates a checkerboard pattern that appears gray at normal viewing distance
 */
export const bitmapTestRenderer: BitmapRenderer = (bitmap, _frame, _env) => {
  // Create alternating pixel pattern
  for (let y = 0; y < bitmap.height; y++) {
    for (let x = 0; x < bitmap.width; x++) {
      // Set pixel if x + y is even (creates checkerboard)
      if ((x + y) % 2 === 0) {
        setPixel(bitmap, x, y)
      }
    }
  }

  // Add a simple message in the center
  const centerX = Math.floor(bitmap.width / 2)
  const centerY = Math.floor(bitmap.height / 2)

  // Clear a rectangle for the message
  for (let y = centerY - 20; y < centerY + 20; y++) {
    for (let x = centerX - 100; x < centerX + 100; x++) {
      // Clear this area (all white)
      clearPixel(bitmap, x, y)
    }
  }

  // Draw a simple box around the cleared area
  // Top and bottom borders
  for (let x = centerX - 100; x < centerX + 100; x++) {
    setPixel(bitmap, x, centerY - 20)
    setPixel(bitmap, x, centerY + 19)
  }

  // Left and right borders
  for (let y = centerY - 20; y < centerY + 20; y++) {
    setPixel(bitmap, centerX - 100, y)
    setPixel(bitmap, centerX + 99, y)
  }
}
