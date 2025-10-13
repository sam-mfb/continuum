#!/usr/bin/env tsx
/**
 * @fileoverview Fix shipshot sprite - create diamond/plus shape
 *
 * This script processes the shipshot-00.png sprite to create the correct pattern:
 * For a 4x4 sprite (0-indexed x,y):
 *   Row 0: transparent, black, black, transparent  -> (1,0), (2,0) are black
 *   Row 1: black, white, white, black              -> (0,1), (3,1) are black; (1,1), (2,1) are white
 *   Row 2: black, white, white, black              -> (0,2), (3,2) are black; (1,2), (2,2) are white
 *   Row 3: transparent, black, black, transparent  -> (1,3), (2,3) are black
 *
 * Usage: npm run fix-shipshot
 */

import { createCanvas, loadImage } from 'canvas'
import { writeFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Sprite paths
const SPRITE_PATHS = [
  join(projectRoot, 'src/dev/public/assets/sprites_bw/shipshot-00.png'),
  join(projectRoot, 'src/game/public/assets/sprites_bw/shipshot-00.png')
]

/**
 * Fix shipshot sprite - create diamond/plus shape
 */
async function fixShipshot(filePath: string): Promise<void> {
  console.log(`Processing ${filePath}...`)

  // Load the image
  const img = await loadImage(filePath)

  if (img.width !== 4 || img.height !== 4) {
    console.warn(
      `  Warning: Expected 4x4 sprite, got ${img.width}x${img.height}`
    )
  }

  // Create canvas and context
  const canvas = createCanvas(4, 4)
  const ctx = canvas.getContext('2d')

  // Get the image data
  const imageData = ctx.createImageData(4, 4)
  const pixels = imageData.data

  // Define the pattern for a 4x4 sprite:
  // t=transparent, b=black(0,0,0,255), w=white(255,255,255,255)
  // Row 0: t b b t
  // Row 1: b w w b
  // Row 2: b w w b
  // Row 3: t b b t

  const pattern = [
    ['t', 'b', 'b', 't'],
    ['b', 'w', 'w', 'b'],
    ['b', 'w', 'w', 'b'],
    ['t', 'b', 'b', 't']
  ]

  // Apply the pattern
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const pixelIndex = (y * 4 + x) * 4
      const pixelType = pattern[y]![x]

      if (pixelType === 't') {
        // Transparent
        pixels[pixelIndex] = 0
        pixels[pixelIndex + 1] = 0
        pixels[pixelIndex + 2] = 0
        pixels[pixelIndex + 3] = 0
      } else if (pixelType === 'b') {
        // Black
        pixels[pixelIndex] = 0
        pixels[pixelIndex + 1] = 0
        pixels[pixelIndex + 2] = 0
        pixels[pixelIndex + 3] = 255
      } else if (pixelType === 'w') {
        // White
        pixels[pixelIndex] = 255
        pixels[pixelIndex + 1] = 255
        pixels[pixelIndex + 2] = 255
        pixels[pixelIndex + 3] = 255
      }
    }
  }

  // Put the modified image data back
  ctx.putImageData(imageData, 0, 0)

  // Save as PNG
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(filePath, buffer)

  console.log('  ✓ Fixed - diamond/plus shape with center 4 white pixels')
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log(
    'Fixing shipshot sprite - keeping only center 4 white pixels...\n'
  )

  for (const path of SPRITE_PATHS) {
    if (existsSync(path)) {
      await fixShipshot(path)
    } else {
      console.log(`Skipping ${path} (does not exist)`)
    }
  }

  console.log('\n✓ Conversion complete!')
}

// Run the script
main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
