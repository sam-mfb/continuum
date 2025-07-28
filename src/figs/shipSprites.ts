import type { ShipSprite, ShipSpriteSet } from './types'
import { SHIP_ROTATIONS, SCENTER, SHIPHT } from './types'
import { rotate90CCW, mirrorHorizontal } from './rotate'

// Create a ship sprite set from the 5 base images
// The rotation scheme creates 32 rotations (11.25° each):
// - Positions 0-4: Base images (0°, 11.25°, 22.5°, 33.75°, 45°)
// - Positions 5-8: 90° CCW rotations of 3,2,1,0 (56.25°, 67.5°, 78.75°, 90°)
// - Positions 9-23: Vertical flips of positions 7→1 and 25→31
// - Positions 24-31: Horizontal mirrors of positions 8→1 (270°→315°)
export function createShipSpriteSet(baseShips: ShipSprite[]): ShipSpriteSet {
  const rotations: Record<number, ShipSprite> = {}

  // Initialize all rotations with empty sprites
  for (let i = 0; i < SHIP_ROTATIONS; i++) {
    rotations[i] = {
      def: new Uint8Array(4 * SHIPHT),
      mask: new Uint8Array(4 * SHIPHT)
    }
  }

  // Copy the 5 base images to positions 0-4
  for (let i = 0; i < 5; i++) {
    rotations[i] = {
      def: new Uint8Array(baseShips[i]?.def ?? []),
      mask: new Uint8Array(baseShips[i]?.mask ?? [])
    }
  }

  // Generate positions 5-8 (90° CCW rotations)
  // Based on rotate_ship() from Figs.c: get_bit(SIZE-y, SIZE-x, ships[k])
  for (let k = 0; k < 4; k++) {
    rotations[8 - k] = {
      def: rotate90CCW(
        baseShips[k]?.def ?? new Uint8Array(4 * SHIPHT),
        2 * SCENTER,
        4
      ),
      mask: rotate90CCW(
        baseShips[k]?.mask ?? new Uint8Array(4 * SHIPHT),
        2 * SCENTER,
        4
      )
    }
  }

  // Generate positions 24-31 (horizontal mirrors of positions 1-8)
  // Based on C code: get_bit(SIZE-x, y, ships[k])
  for (let k = 1; k < 9; k++) {
    rotations[32 - k] = {
      def: mirrorHorizontal(
        rotations[k]?.def ?? new Uint8Array(4 * SHIPHT),
        2 * SCENTER,
        4
      ),
      mask: mirrorHorizontal(
        rotations[k]?.mask ?? new Uint8Array(4 * SHIPHT),
        2 * SCENTER,
        4
      )
    }
  }

  // Generate positions 9-23 by copying with vertical flip
  // Based on the C code which does: ships[8+k][y*2+x] = ships[8-k][SIZE*2 - y*2 + x]
  // In C, Ship_Pic is int[SHIPHT*2], so y*2+x is indexing ints (2 bytes each)
  // In our TypeScript, we use bytes, so we need to handle this differently
  
  for (let k = 1; k < 9; k++) {
    // Create rotations 8+k (9-16) from 8-k by vertical flip
    const src8k = rotations[8 - k]
    if (src8k) {
      const newDef = new Uint8Array(4 * SHIPHT)
      const newMask = new Uint8Array(4 * SHIPHT)
      
      // Copy entire sprite with vertical flip
      for (let y = 0; y < SHIPHT; y++) {
        for (let byteX = 0; byteX < 4; byteX++) {
          const srcY = SHIPHT - 1 - y
          const srcIdx = srcY * 4 + byteX
          const dstIdx = y * 4 + byteX
          newDef[dstIdx] = src8k.def[srcIdx] ?? 0
          newMask[dstIdx] = src8k.mask[srcIdx] ?? 0
        }
      }
      
      rotations[8 + k] = { def: newDef, mask: newMask }
    }
    
    // Create rotations 24-k (23-16) from 24+k by vertical flip
    if (k !== 8) {
      const src24k = rotations[24 + k]
      if (src24k) {
        const newDef = new Uint8Array(4 * SHIPHT)
        const newMask = new Uint8Array(4 * SHIPHT)
        
        // Copy entire sprite with vertical flip
        for (let y = 0; y < SHIPHT; y++) {
          for (let byteX = 0; byteX < 4; byteX++) {
            const srcY = SHIPHT - 1 - y
            const srcIdx = srcY * 4 + byteX
            const dstIdx = y * 4 + byteX
            newDef[dstIdx] = src24k.def[srcIdx] ?? 0
            newMask[dstIdx] = src24k.mask[srcIdx] ?? 0
          }
        }
        
        rotations[24 - k] = { def: newDef, mask: newMask }
      }
    }
  }

  return {
    rotations,

    getRotation(degrees: number): ShipSprite {
      // Convert 0-359° to 0-31 rotation index
      // 0° = straight up, rotating clockwise
      const normalizedDegrees = ((degrees % 360) + 360) % 360
      const index = Math.round(normalizedDegrees / 11.25) % SHIP_ROTATIONS
      const sprite = rotations[index]
      if (!sprite) throw new Error(`Ship sprite not found at index ${index}`)
      return sprite
    },

    getRotationIndex(index: number): ShipSprite {
      // Direct access by rotation index 0-31
      const sprite = rotations[index % SHIP_ROTATIONS]
      if (!sprite) throw new Error(`Ship sprite not found at index ${index}`)
      return sprite
    }
  }
}


// Debug helper to visualize a ship sprite as ASCII art
export function shipSpriteToAscii(sprite: ShipSprite): string {
  const lines: string[] = []

  for (let y = 0; y < SHIPHT; y++) {
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
