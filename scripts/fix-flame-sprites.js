#!/usr/bin/env node

/**
 * Fix flame sprites by converting interior transparent pixels to white.
 * A transparent pixel is considered "interior" if it has black pixels on
 * opposite sides (either horizontally or vertically).
 */

import sharp from 'sharp'
import { readdir } from 'fs/promises'
import { join } from 'path'

const SPRITES_DIR = process.argv[2] || 'src/game/public/assets/sprites_bw'

async function fixFlameSprite(inputPath, outputPath) {
  // Read image data
  const image = sharp(inputPath)
  const { data, info } = await image
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height, channels } = info
  const pixels = new Uint8ClampedArray(data)

  console.log(`Processing ${inputPath} (${width}x${height})`)

  // Helper to get pixel index
  const getIndex = (x, y) => (y * width + x) * channels

  // Check if a pixel is black (r=0, g=0, b=0, a>0)
  const isBlack = (x, y) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return false
    const i = getIndex(x, y)
    return (
      pixels[i] === 0 &&
      pixels[i + 1] === 0 &&
      pixels[i + 2] === 0 &&
      pixels[i + 3] > 0
    )
  }

  // Check if a pixel is transparent (a=0)
  const isTransparent = (x, y) => {
    const i = getIndex(x, y)
    return pixels[i + 3] === 0
  }

  // Check if there's black in a given direction
  const hasBlackInDirection = (x, y, dx, dy) => {
    let cx = x + dx
    let cy = y + dy
    while (cx >= 0 && cx < width && cy >= 0 && cy < height) {
      if (isBlack(cx, cy)) return true
      cx += dx
      cy += dy
    }
    return false
  }

  let convertedCount = 0

  // Process each pixel
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isTransparent(x, y)) continue

      // Check horizontal: black on left AND black on right
      const hasLeft = hasBlackInDirection(x, y, -1, 0)
      const hasRight = hasBlackInDirection(x, y, 1, 0)
      const hasHorizontal = hasLeft && hasRight

      // Check vertical: black above AND black below
      const hasAbove = hasBlackInDirection(x, y, 0, -1)
      const hasBelow = hasBlackInDirection(x, y, 0, 1)
      const hasVertical = hasAbove && hasBelow

      // Convert to white if bordered on opposite sides
      if (hasHorizontal || hasVertical) {
        const i = getIndex(x, y)
        pixels[i] = 255 // R
        pixels[i + 1] = 255 // G
        pixels[i + 2] = 255 // B
        pixels[i + 3] = 255 // A
        convertedCount++
      }
    }
  }

  console.log(`  Converted ${convertedCount} transparent pixels to white`)

  // Write the modified image
  await sharp(pixels, {
    raw: {
      width,
      height,
      channels
    }
  })
    .png()
    .toFile(outputPath)
}

async function main() {
  const files = await readdir(SPRITES_DIR)
  const flameFiles = files.filter(
    f => f.startsWith('flame-') && f.endsWith('.png')
  )

  console.log(`Found ${flameFiles.length} flame sprites\n`)

  for (const file of flameFiles) {
    const inputPath = join(SPRITES_DIR, file)
    const outputPath = inputPath // Overwrite original
    await fixFlameSprite(inputPath, outputPath)
  }

  console.log('\nDone!')
}

main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
