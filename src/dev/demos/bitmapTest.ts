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
  const clearedBitmap = viewClear({
    screenX: 0,
    screenY: 0
  })(bitmap)
  bitmap.data.set(clearedBitmap.data)

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
