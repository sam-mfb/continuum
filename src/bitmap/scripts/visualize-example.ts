/**
 * A Node.js script to visualize MonochromeBitmap objects in the terminal.
 *
 * Usage:
 * vite-node src/bitmap/scripts/visualize-example.ts
 *
 * This script demonstrates how to create a bitmap, draw on it, and then
 * print a string representation to the console. It also shows how to

 * visualize a clipped portion of the bitmap.
 */

import { createMonochromeBitmap } from '../create'
import { setPixel } from '../operations'
import { visualizeBitmap } from '../visualize'

const main = (): void => {
  console.log('Creating a 40x15 bitmap and drawing a box in it.')
  const bitmap = createMonochromeBitmap(40, 15)

  // Draw a rectangle from (5,2) to (35,12)
  for (let y = 2; y < 13; y++) {
    for (let x = 5; x < 35; x++) {
      if (x === 5 || x === 34 || y === 2 || y === 12) {
        setPixel(bitmap, x, y)
      }
    }
  }

  // Add some "text" inside
  setPixel(bitmap, 15, 6)
  setPixel(bitmap, 16, 6)
  setPixel(bitmap, 18, 6)
  setPixel(bitmap, 19, 6)
  setPixel(bitmap, 20, 6)
  setPixel(bitmap, 22, 6)
  setPixel(bitmap, 23, 6)

  setPixel(bitmap, 15, 7)
  setPixel(bitmap, 18, 7)
  setPixel(bitmap, 22, 7)

  setPixel(bitmap, 15, 8)
  setPixel(bitmap, 16, 8)
  setPixel(bitmap, 18, 8)
  setPixel(bitmap, 19, 8)
  setPixel(bitmap, 22, 8)
  setPixel(bitmap, 23, 8)

  console.log('\n--- Full Bitmap ---')
  console.log(visualizeBitmap(bitmap))

  console.log(
    '\n--- Clipped Bitmap { top: 0, left: 3, bottom: 10, right: 25 } ---',
  )
  const clip = { top: 0, left: 3, bottom: 10, right: 25 }
  console.log(visualizeBitmap(bitmap, clip))

  console.log('\n--- Another Clipped Bitmap ---')
  const clip2 = { top: 5, left: 10, bottom: 10, right: 30 }
  console.log(visualizeBitmap(bitmap, clip2))
}

main()
