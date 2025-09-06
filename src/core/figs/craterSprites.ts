import type { CraterSprite } from './types'
import { CRATERHT } from './types'
import { getBackgroundPattern } from '@core/shared/backgroundPattern'
import type { Alignment } from '@core/shared/alignment'

// Process crater sprite with background patterns
export function processCraterSprite(
  def: Uint8Array,
  mask: Uint8Array
): CraterSprite {
  return {
    def: new Uint8Array(def),
    mask: new Uint8Array(mask),
    images: {
      background1: applyCraterBackground(def, mask, 0),
      background2: applyCraterBackground(def, mask, 1)
    }
  }
}

// Apply background pattern to crater sprite
function applyCraterBackground(
  def: Uint8Array,
  mask: Uint8Array,
  initialAlignment: 0 | 1
): Uint8Array {
  const result = new Uint8Array(def.length)

  // Crater is stored as 2 integers per row (4 bytes per row)
  // Process each row
  for (let row = 0; row < CRATERHT; row++) {
    const rowOffset = row * 4

    // Simply alternate patterns based on row parity and initial alignment
    // This is NOT a position calculation, just picking alternating patterns
    const rowAlign = (initialAlignment + row) % 2 === 0 ? 0 : 1
    const bgPattern = getBackgroundPattern(rowAlign as Alignment)

    // Process 4 bytes per row
    for (let byte = 0; byte < 4; byte++) {
      const idx = rowOffset + byte

      // Extract byte from background pattern
      const bgByte = (bgPattern >> ((3 - byte) * 8)) & 0xff

      // Apply formula: (background & mask) ^ def
      const maskByte = mask[idx] ?? 0
      const defByte = def[idx] ?? 0
      result[idx] = (bgByte & maskByte) ^ defByte
    }
  }

  return result
}

// Debug helper to visualize crater sprite as ASCII art
export function craterSpriteToAscii(crater: CraterSprite): string {
  const lines: string[] = []

  for (let y = 0; y < CRATERHT; y++) {
    let line = ''
    for (let x = 0; x < 32; x++) {
      const byteIdx = y * 4 + Math.floor(x / 8)
      const bitIdx = 7 - (x % 8)
      const bit = ((crater.def[byteIdx] ?? 0) >> bitIdx) & 1
      line += bit ? '█' : ' '
    }
    lines.push(line)
  }

  return lines.join('\n')
}

// Get appropriate background image based on y position
export function getCraterBackground(
  crater: CraterSprite,
  yPosition: number
): Uint8Array {
  // Use background1 for even y positions, background2 for odd
  return (yPosition & 1) === 0
    ? crater.images.background1
    : crater.images.background2
}

// Check if a point is within the crater (for collision detection)
export function isPointInCrater(
  crater: CraterSprite,
  x: number,
  y: number
): boolean {
  if (x < 0 || x >= 32 || y < 0 || y >= CRATERHT) {
    return false
  }

  const byteIdx = y * 4 + Math.floor(x / 8)
  const bitIdx = 7 - (x % 8)

  // Check the mask to see if this pixel is part of the crater
  return ((crater.mask[byteIdx] ?? 0) & (1 << bitIdx)) !== 0
}
