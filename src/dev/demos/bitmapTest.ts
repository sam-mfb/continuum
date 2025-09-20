/**
 * Simple bitmap test game that displays a gray pattern
 */

import type { BitmapRenderer } from '@lib/bitmap'
import { setPixel, clearPixel } from '@lib/bitmap'
import { viewClear } from '@core/screen'

/**
 * Creates a checkerboard pattern that appears gray at normal viewing distance
 */
export const bitmapTestRenderer: BitmapRenderer = (bitmap, _frame, _env) => {
  // Create alternating pixel pattern using viewClear with local coordinates
  let result = viewClear({
    screenX: 0,
    screenY: 0
  })(bitmap)

  // Add a simple message in the center
  const centerX = Math.floor(result.width / 2)
  const centerY = Math.floor(result.height / 2)

  // Clear a rectangle for the message
  for (let y = centerY - 20; y < centerY + 20; y++) {
    for (let x = centerX - 100; x < centerX + 100; x++) {
      // Clear this area (all white)
      clearPixel(result, x, y)
    }
  }

  // Draw a simple box around the cleared area
  // Top and bottom borders
  for (let x = centerX - 100; x < centerX + 100; x++) {
    setPixel(result, x, centerY - 20)
    setPixel(result, x, centerY + 19)
  }

  // Left and right borders
  for (let y = centerY - 20; y < centerY + 20; y++) {
    setPixel(result, centerX - 100, y)
    setPixel(result, centerX + 99, y)
  }

  return result
}
