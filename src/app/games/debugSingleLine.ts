/**
 * Debug script to visualize the single line rendering
 */

import { createMonochromeBitmap } from '../../bitmap'
import { singleLineTestRenderer } from './singleLineTest'

// Create a bitmap (standard size from the game)
const bitmap = createMonochromeBitmap(512, 342)

// Run the renderer once
singleLineTestRenderer(bitmap, 0, {
  keyboard: { current: new Set() },
  mouse: { x: 0, y: 0, buttons: 0 }
})

// The line should be at x=200, from y=100 to y=150
// Let's visualize a larger region: x=190-250, y=90-220

console.log('Bitmap visualization around expected line location:')
console.log('Line should be at x=200, from y=100 to y=150')
console.log('X-axis: 190-250, Y-axis: 90-220')
console.log('Legend: . = white pixel (0), # = black pixel (1)')
console.log('')

// Print column headers
let header = '    '
for (let x = 190; x <= 250; x++) {
  header += `${x % 10}`
}
console.log(header)

// Print each row
for (let y = 90; y <= 220; y++) {
  // Build row string
  let row = `${y.toString().padStart(3)} `
  
  // Add pixels in this row
  for (let x = 190; x <= 250; x++) {
    const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
    const bitIndex = 7 - (x % 8)
    const pixel = (bitmap.data[byteIndex]! >> bitIndex) & 1
    row += pixel ? '#' : '.'
  }
  console.log(row)
}

// Also check if any pixels are set at all in the expected area
let blackPixelCount = 0
for (let y = 90; y <= 220; y++) {
  for (let x = 190; x <= 250; x++) {
    const byteIndex = Math.floor(y * bitmap.rowBytes + x / 8)
    const bitIndex = 7 - (x % 8)
    const pixel = (bitmap.data[byteIndex]! >> bitIndex) & 1
    if (pixel) blackPixelCount++
  }
}

console.log(`\nTotal black pixels in region: ${blackPixelCount}`)

// Check the entire bitmap for any rendering
let totalBlackPixels = 0
for (let i = 0; i < bitmap.data.length; i++) {
  const byte = bitmap.data[i]!
  for (let bit = 0; bit < 8; bit++) {
    if ((byte >> bit) & 1) totalBlackPixels++
  }
}

console.log(`Total black pixels in entire bitmap: ${totalBlackPixels}`)

// Export for running with ts-node
export {}