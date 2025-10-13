#!/usr/bin/env tsx
/**
 * @fileoverview Convert white pixels to transparent in sprite PNGs
 *
 * This script processes flame and strafe sprite PNGs, converting any white pixels
 * (RGB 255,255,255) to transparent pixels while preserving black pixels.
 *
 * Usage: npm run convert-sprites
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
 * Convert white pixels to transparent in a PNG image
 */
async function convertWhiteToTransparent(
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

  // Convert white pixels to transparent
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]!
    const g = pixels[i + 1]!
    const b = pixels[i + 2]!
    const a = pixels[i + 3]!

    // If pixel is white (R=G=B=255 and not already transparent)
    if (r === 255 && g === 255 && b === 255 && a === 255) {
      // Make it transparent
      pixels[i + 3] = 0
    }
  }

  // Put the modified image data back
  ctx.putImageData(imageData, 0, 0)

  // Save as PNG
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(outputPath, buffer)
}

/**
 * Process all flame and strafe sprites in a directory
 */
async function processDirectory(dirPath: string): Promise<void> {
  console.log(`Processing directory: ${dirPath}`)

  try {
    const files = readdirSync(dirPath)

    // Filter for flame and strafe sprites
    const targetFiles = files.filter(
      file =>
        (file.startsWith('flame-') || file.startsWith('strafe-')) &&
        file.endsWith('.png')
    )

    console.log(`Found ${targetFiles.length} sprites to convert`)

    for (const file of targetFiles) {
      const filePath = join(dirPath, file)
      console.log(`  Converting ${file}...`)
      await convertWhiteToTransparent(filePath, filePath)
    }
  } catch (err) {
    console.error(`Error processing directory ${dirPath}:`, err)
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  console.log('Converting white pixels to transparent in sprite PNGs...\n')

  for (const dir of SPRITE_DIRS) {
    await processDirectory(dir)
    console.log()
  }

  console.log('✓ Conversion complete!')
}

// Run the script
main().catch(err => {
  console.error('Error:', err)
  process.exit(1)
})
