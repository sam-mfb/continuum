#!/usr/bin/env tsx
/**
 * @fileoverview Invert digit sprites and convert black to transparent
 *
 * This script processes digit sprite PNGs (digit-*.png):
 * 1. Inverts the colors (black becomes white, white becomes black)
 * 2. Converts black pixels to transparent
 * Result: White text on transparent background
 *
 * Usage: npm run convert-digits
 */

import { createCanvas, loadImage } from 'canvas'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

// Directories to process
const SPRITE_DIRS = [
  join(projectRoot, 'src/dev/public/assets/sprites_bw'),
  join(projectRoot, 'src/game/public/assets/sprites_bw')
]

/**
 * Invert colors and convert black to transparent
 */
async function invertAndMakeTransparent(
  inputPath: string,
  outputPath: string
): Promise<void> {
  // Load the image
  const img = await loadImage(inputPath)

  // Create canvas and context
  const canvas = createCanvas(img.width, img.height)
  const ctx = canvas.getContext('2d')

  // Draw the image
  ctx.drawImage(img, 0, 0)

  // Get the image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = imageData.data

  // Process each pixel: invert colors and make black transparent
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!
    const g = pixels[i + 1]!
    const b = pixels[i + 2]!
    const a = pixels[i + 3]!

    // Skip already transparent pixels
    if (a === 0) continue

    // Invert the colors (255 - value)
    const invertedR = 255 - r
    const invertedG = 255 - g
    const invertedB = 255 - b

    // Write inverted colors
    pixels[i] = invertedR
    pixels[i + 1] = invertedG
    pixels[i + 2] = invertedB

    // If the INVERTED color is black (was white originally), make it transparent
    // This means: if original pixel was white (255,255,255),
    // after inversion it's black (0,0,0), so make it transparent
    if (invertedR === 0 && invertedG === 0 && invertedB === 0) {
      pixels[i + 3] = 0 // Make transparent
    } else {
      pixels[i + 3] = 255 // Keep opaque
    }
  }

  // Put the modified image data back
  ctx.putImageData(imageData, 0, 0)

  // Save as PNG
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(outputPath, buffer)
}

/**
 * Process all digit and status bar sprites in a directory
 */
async function processDirectory(dirPath: string): Promise<void> {
  console.log(`Processing directory: ${dirPath}`)

  try {
    const files = readdirSync(dirPath)

    // Filter for digit sprites only (not status bar)
    const targetFiles = files.filter(
      file => file.startsWith('digit-') && file.endsWith('.png')
    )

    console.log(`Found ${targetFiles.length} sprites to convert`)

    for (const file of targetFiles) {
      const filePath = join(dirPath, file)
      console.log(`  Converting ${file}...`)
      await invertAndMakeTransparent(filePath, filePath)
    }
  } catch (err) {
    console.error(`Error processing directory ${dirPath}:`, err)
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log(
    'Inverting digit sprites and converting black to transparent...\n'
  )

  for (const dir of SPRITE_DIRS) {
    await processDirectory(dir)
    console.log()
  }

  console.log('✓ Conversion complete!')
  console.log('Result: White digits/characters on transparent background')
}

// Run the script
main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
