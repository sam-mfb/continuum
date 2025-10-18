#!/usr/bin/env tsx
/**
 * @fileoverview Export all sprites from the game resource files to PNG images
 *
 * This script loads sprite data from the original game resource files and
 * exports each sprite (def variant only) as a PNG file to public/assets/sprites/
 *
 * Usage: npm run export-sprites
 */

import { createCanvas } from 'canvas'
import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { extractAllSprites, BunkerKind } from '../src/core/figs/index.js'
import { expandTitlePage } from '../src/core/shared/index.js'
import { createMonochromeBitmap } from '../src/lib/bitmap/index.js'
import type { MonochromeBitmap } from '../src/lib/bitmap/types.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')
const outputDir = join(projectRoot, 'public/assets/sprites_orig')

// Resource file paths
const SPRITE_RESOURCE = join(projectRoot, 'src/dev/public/rsrc_260.bin')
const STATUS_BAR_RESOURCE = join(projectRoot, 'src/dev/public/rsrc_259.bin')
const TITLE_PAGE_RESOURCE = join(
  projectRoot,
  'src/dev/art/graphics/rsrc_261.bin'
)

/**
 * Pad a number with leading zeros
 */
function padNumber(num: number, width: number): string {
  return num.toString().padStart(width, '0')
}

/**
 * Convert MonochromeBitmap to PNG and save to file
 * If mask is provided, uses it to determine transparency
 */
function saveBitmapAsPNG(
  bitmap: MonochromeBitmap,
  filepath: string,
  mask?: Uint8Array
): void {
  const canvas = createCanvas(bitmap.width, bitmap.height)
  const ctx = canvas.getContext('2d')

  // Create ImageData
  const imageData = ctx.createImageData(bitmap.width, bitmap.height)
  const pixels = imageData.data

  // Convert monochrome bitmap to RGBA
  // Process byte by byte, bit by bit (MSB to LSB within each byte)
  // This matches the bytesToImageData function used in the working code
  let pixelIndex = 0
  for (let byteIndex = 0; byteIndex < bitmap.data.length; byteIndex++) {
    const byte = bitmap.data[byteIndex]!
    const maskByte = mask ? mask[byteIndex]! : 0xff

    // Process 8 bits in this byte (MSB first: bit 7 down to bit 0)
    for (let bitPos = 7; bitPos >= 0; bitPos--) {
      const isSet = (byte >>> bitPos) & 1
      const inMask = (maskByte >>> bitPos) & 1

      // Black pixels for set bits, white for unset
      if (isSet === 1) {
        pixels[pixelIndex] = 0 // R
        pixels[pixelIndex + 1] = 0 // G
        pixels[pixelIndex + 2] = 0 // B
        pixels[pixelIndex + 3] = 255 // A
      } else if (inMask === 1) {
        // White pixel within mask
        pixels[pixelIndex] = 255 // R
        pixels[pixelIndex + 1] = 255 // G
        pixels[pixelIndex + 2] = 255 // B
        pixels[pixelIndex + 3] = 255 // A
      } else {
        // Transparent pixel outside mask
        pixels[pixelIndex] = 0 // R
        pixels[pixelIndex + 1] = 0 // G
        pixels[pixelIndex + 2] = 0 // B
        pixels[pixelIndex + 3] = 0 // A (transparent)
      }

      pixelIndex += 4
    }
  }

  ctx.putImageData(imageData, 0, 0)

  // Save as PNG
  const buffer = canvas.toBuffer('image/png')
  writeFileSync(filepath, buffer)
}

/**
 * Main export function
 */
async function exportSprites(): Promise<void> {
  console.log('Loading sprite resources...')

  // Load sprite resource file
  const spriteBuffer = readFileSync(SPRITE_RESOURCE)
  const spriteArrayBuffer = spriteBuffer.buffer.slice(
    spriteBuffer.byteOffset,
    spriteBuffer.byteOffset + spriteBuffer.byteLength
  )
  const allSprites = extractAllSprites(spriteArrayBuffer)

  // Load status bar
  const statusBarBuffer = readFileSync(STATUS_BAR_RESOURCE)
  // Use buffer.slice() to get a proper ArrayBuffer without offset issues
  const statusBarArrayBuffer = statusBarBuffer.buffer.slice(
    statusBarBuffer.byteOffset,
    statusBarBuffer.byteOffset + statusBarBuffer.byteLength
  )
  const statusBarData = expandTitlePage(statusBarArrayBuffer, 24)
  const statusBar = createMonochromeBitmap(512, 24)
  statusBar.data.set(statusBarData)

  // Load title page
  const titlePageBuffer = readFileSync(TITLE_PAGE_RESOURCE)
  const titlePageArrayBuffer = titlePageBuffer.buffer.slice(
    titlePageBuffer.byteOffset,
    titlePageBuffer.byteOffset + titlePageBuffer.byteLength
  )
  const titlePageData = expandTitlePage(titlePageArrayBuffer, 342)
  const titlePage = createMonochromeBitmap(512, 342)
  titlePage.data.set(titlePageData)

  // Ensure output directory exists
  mkdirSync(outputDir, { recursive: true })

  console.log(`Exporting sprites to ${outputDir}...`)

  // Export ship sprites (32 rotations)
  console.log('Exporting ships...')
  for (let rotation = 0; rotation < 32; rotation++) {
    const sprite = allSprites.ships.getRotationIndex(rotation)
    const bitmap: MonochromeBitmap = {
      data: sprite.def,
      width: 32,
      height: 32,
      rowBytes: 4
    }
    saveBitmapAsPNG(
      bitmap,
      join(outputDir, `ship-${padNumber(rotation, 2)}.png`),
      sprite.mask
    )
  }

  // Export bunker sprites
  console.log('Exporting bunkers...')
  for (const [key, kindValue] of Object.entries(BunkerKind)) {
    if (typeof kindValue !== 'number') continue
    const kind = kindValue as BunkerKind
    const kindName = key.toLowerCase()

    if (kind === BunkerKind.WALL || kind === BunkerKind.DIFF) {
      // Rotating bunkers: 16 rotations
      for (let rotation = 0; rotation < 16; rotation++) {
        const sprite = allSprites.bunkers.getSprite(kind, rotation)
        const bitmap: MonochromeBitmap = {
          data: sprite.def,
          width: 48,
          height: 48,
          rowBytes: 6
        }
        saveBitmapAsPNG(
          bitmap,
          join(outputDir, `bunker-${kindName}-${padNumber(rotation, 2)}.png`),
          sprite.mask
        )
      }
    } else {
      // Animated bunkers: 8 frames
      for (let frame = 0; frame < 8; frame++) {
        const sprite = allSprites.bunkers.getSprite(kind, frame)
        const bitmap: MonochromeBitmap = {
          data: sprite.def,
          width: 48,
          height: 48,
          rowBytes: 6
        }
        saveBitmapAsPNG(
          bitmap,
          join(outputDir, `bunker-${kindName}-${padNumber(frame, 2)}.png`),
          sprite.mask
        )
      }
    }
  }

  // Export fuel sprites (9 frames including empty)
  console.log('Exporting fuel...')
  for (let frame = 0; frame < 9; frame++) {
    const sprite =
      frame === 8
        ? allSprites.fuels.emptyCell
        : allSprites.fuels.getFrame(frame)
    const bitmap: MonochromeBitmap = {
      data: sprite.def,
      width: 32,
      height: 32,
      rowBytes: 4
    }
    saveBitmapAsPNG(
      bitmap,
      join(outputDir, `fuel-${padNumber(frame, 2)}.png`),
      sprite.mask
    )
  }

  // Export shard sprites (7 kinds, 16 rotations each)
  console.log('Exporting shards...')
  for (let kind = 0; kind < 7; kind++) {
    for (let rotation = 0; rotation < 16; rotation++) {
      const sprite = allSprites.shards.getSprite(kind, rotation)
      const bitmap: MonochromeBitmap = {
        data: sprite.def,
        width: 16,
        height: 16,
        rowBytes: 2
      }
      saveBitmapAsPNG(
        bitmap,
        join(outputDir, `shard-${kind}-${padNumber(rotation, 2)}.png`),
        sprite.mask
      )
    }
  }

  // Export crater
  console.log('Exporting crater...')
  const crater: MonochromeBitmap = {
    data: allSprites.crater.def,
    width: 32,
    height: 32,
    rowBytes: 4
  }
  saveBitmapAsPNG(crater, join(outputDir, 'crater.png'), allSprites.crater.mask)

  // Export shield
  console.log('Exporting shield...')
  const shield: MonochromeBitmap = {
    data: allSprites.shield.def,
    width: 32,
    height: 32,
    rowBytes: 4
  }
  saveBitmapAsPNG(shield, join(outputDir, 'shield.png'))

  // Export flame sprites
  console.log('Exporting flames...')
  for (let frame = 0; frame < allSprites.flames.frames.length; frame++) {
    const flameData = allSprites.flames.getFrame(frame)
    const bitmap: MonochromeBitmap = {
      data: flameData.def,
      width: flameData.width,
      height: flameData.height,
      rowBytes: flameData.width / 8
    }
    saveBitmapAsPNG(bitmap, join(outputDir, `flame-${padNumber(frame, 2)}.png`))
  }

  // Export strafe sprites (16 rotations)
  console.log('Exporting strafe...')
  for (let rotation = 0; rotation < 16; rotation++) {
    const strafeData = allSprites.strafe.getFrame(rotation)
    const bitmap: MonochromeBitmap = {
      data: strafeData,
      width: 8,
      height: 8,
      rowBytes: 1
    }
    saveBitmapAsPNG(
      bitmap,
      join(outputDir, `strafe-${padNumber(rotation, 2)}.png`)
    )
  }

  // Export digit sprites
  console.log('Exporting digits...')
  // Numbers 0-9
  for (let i = 0; i <= 9; i++) {
    const char = i.toString()
    const digitData = allSprites.digits.getCharacter(char)
    if (digitData) {
      const bitmap: MonochromeBitmap = {
        data: digitData,
        width: 8,
        height: 9,
        rowBytes: 1
      }
      saveBitmapAsPNG(bitmap, join(outputDir, `digit-${char}.png`))
    }
  }

  // Letters A-Z
  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode('A'.charCodeAt(0) + i)
    const digitData = allSprites.digits.getCharacter(char)
    if (digitData) {
      const bitmap: MonochromeBitmap = {
        data: digitData,
        width: 8,
        height: 9,
        rowBytes: 1
      }
      saveBitmapAsPNG(bitmap, join(outputDir, `digit-${char}.png`))
    }
  }

  // Special characters
  const shipDigit = allSprites.digits.getCharacter('SHIP')
  if (shipDigit) {
    const bitmap: MonochromeBitmap = {
      data: shipDigit,
      width: 8,
      height: 9,
      rowBytes: 1
    }
    saveBitmapAsPNG(bitmap, join(outputDir, 'digit-SHIP.png'))
  }

  const spaceDigit = allSprites.digits.getCharacter(' ')
  if (spaceDigit) {
    const bitmap: MonochromeBitmap = {
      data: spaceDigit,
      width: 8,
      height: 9,
      rowBytes: 1
    }
    saveBitmapAsPNG(bitmap, join(outputDir, 'digit-SPACE.png'))
  }

  // Export status bar
  console.log('Exporting status bar...')
  saveBitmapAsPNG(statusBar, join(outputDir, 'status-bar.png'))

  // Export title page
  console.log('Exporting title page...')
  saveBitmapAsPNG(titlePage, join(outputDir, 'title-page.png'))

  console.log('✓ Export complete!')
}

// Run the export
exportSprites().catch(err => {
  console.error('Error exporting sprites:', err)
  process.exit(1)
})
