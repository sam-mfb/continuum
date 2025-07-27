import type { FuelSprite, FuelSpriteSet } from './types'
import { FUELFRAMES, FUELHT, BACKGROUND1, BACKGROUND2 } from './types'

// Create a fuel sprite set from extracted arrays
export function createFuelSpriteSet(fuelArrays: FuelSprite[]): FuelSpriteSet {
  const frames: FuelSprite[] = []

  // Process animation frames (0-2)
  for (let i = 0; i < FUELFRAMES; i++) {
    const sprite = fuelArrays[i]
    if (!sprite) continue
    frames[i] = {
      def: new Uint8Array(sprite.def),
      mask: new Uint8Array(sprite.mask),
      images: {
        background1: applyFuelBackground(sprite.def, sprite.mask, BACKGROUND1),
        background2: applyFuelBackground(sprite.def, sprite.mask, BACKGROUND2)
      }
    }
  }

  // The last sprite (index 3) is the empty fuel cell
  const emptyCell = fuelArrays[FUELFRAMES]
  if (!emptyCell) {
    throw new Error('Empty fuel cell sprite not found')
  }
  const emptySprite: FuelSprite = {
    def: new Uint8Array(emptyCell.def),
    mask: new Uint8Array(emptyCell.mask),
    images: {
      background1: applyFuelBackground(
        emptyCell.def,
        emptyCell.mask,
        BACKGROUND1
      ),
      background2: applyFuelBackground(
        emptyCell.def,
        emptyCell.mask,
        BACKGROUND2
      )
    }
  }

  return {
    frames,
    emptyCell: emptySprite,

    getFrame(index: number): FuelSprite {
      // Cycle through animation frames
      const sprite = frames[index % FUELFRAMES]
      if (!sprite) throw new Error(`Fuel sprite not found at index ${index}`)
      return sprite
    }
  }
}

// Apply background pattern to fuel sprite
function applyFuelBackground(
  def: Uint8Array,
  mask: Uint8Array,
  background: number
): Uint8Array {
  const result = new Uint8Array(def.length)

  // Process each row
  for (let row = 0; row < FUELHT; row++) {
    const rowOffset = row * 4

    // Alternate background pattern by row
    const bgPattern = row % 2 === 0 ? background : ~background

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

// Debug helper to visualize a fuel sprite as ASCII art
export function fuelSpriteToAscii(sprite: FuelSprite): string {
  const lines: string[] = []

  for (let y = 0; y < FUELHT; y++) {
    let line = ''
    for (let x = 0; x < 32; x++) {
      const byteIdx = y * 4 + Math.floor(x / 8)
      const bitIdx = 7 - (x % 8)
      const bit = ((sprite.def[byteIdx] ?? 0) >> bitIdx) & 1
      line += bit ? '█' : ' '
    }
    lines.push(line)
  }

  return lines.join('\n')
}

// Get appropriate background image based on y position
export function getFuelBackground(
  sprite: FuelSprite,
  yPosition: number
): Uint8Array {
  // Use background1 for even y positions, background2 for odd
  return (yPosition & 1) === 0
    ? sprite.images.background1
    : sprite.images.background2
}
