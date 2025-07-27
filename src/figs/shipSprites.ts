import type { ShipSprite, ShipSpriteSet } from './types'
import { SHIP_ROTATIONS, SCENTER, SHIPHT } from './types'
import { rotate90, mirrorVertical, interpolateShipRotation } from './rotate'

// Create a ship sprite set from the 5 base images
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

  // Generate positions 5-8 (90° rotations of positions 0-3)
  // Based on rotate_ship() from Figs.c
  for (let k = 0; k < 4; k++) {
    rotations[8 - k] = {
      def: rotate90(
        baseShips[k]?.def ?? new Uint8Array(4 * SHIPHT),
        2 * SCENTER,
        4
      ),
      mask: rotate90(
        baseShips[k]?.mask ?? new Uint8Array(4 * SHIPHT),
        2 * SCENTER,
        4
      )
    }
  }

  // Generate positions 24-31 (vertical mirrors of positions 1-8)
  for (let k = 1; k < 9; k++) {
    rotations[32 - k] = {
      def: mirrorVertical(
        rotations[k]?.def ?? new Uint8Array(4 * SHIPHT),
        32,
        SHIPHT,
        4
      ),
      mask: mirrorVertical(
        rotations[k]?.mask ?? new Uint8Array(4 * SHIPHT),
        32,
        SHIPHT,
        4
      )
    }
  }

  // Generate positions 9-15 (interpolated between existing rotations)
  // These fill in the gaps between 0°-180°
  generateIntermediateRotations(rotations, 0, 4, 2) // 9-10 between 0 and 4
  generateIntermediateRotations(rotations, 4, 8, 11) // 11-14 between 4 and 8
  rotations[15] = {
    def: new Uint8Array(rotations[8]?.def ?? []),
    mask: new Uint8Array(rotations[8]?.mask ?? [])
  }

  // Generate positions 16-23 (interpolated between existing rotations)
  // These fill in the gaps between 180°-360°
  rotations[16] = {
    def: new Uint8Array(rotations[24]?.def ?? []),
    mask: new Uint8Array(rotations[24]?.mask ?? [])
  }
  generateIntermediateRotations(rotations, 24, 28, 17) // 17-20 between 24 and 28
  generateIntermediateRotations(rotations, 28, 32, 21) // 21-22 between 28 and 32
  rotations[23] = {
    def: new Uint8Array(rotations[31]?.def ?? []),
    mask: new Uint8Array(rotations[31]?.mask ?? [])
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

// Generate intermediate rotations by interpolating between two existing rotations
function generateIntermediateRotations(
  rotations: Record<number, ShipSprite>,
  startIdx: number,
  endIdx: number,
  targetStartIdx: number
): void {
  const steps = endIdx - startIdx

  for (let i = 1; i < steps; i++) {
    const weight = i / steps
    const targetIdx = targetStartIdx + i - 1

    // Handle wrap-around for rotation 32 -> 0
    const actualEndIdx = endIdx === 32 ? 0 : endIdx

    rotations[targetIdx] = {
      def: interpolateShipRotation(
        rotations[startIdx]?.def ?? new Uint8Array(4 * SHIPHT),
        rotations[actualEndIdx]?.def ?? new Uint8Array(4 * SHIPHT),
        weight,
        2 * SCENTER,
        4
      ),
      mask: interpolateShipRotation(
        rotations[startIdx]?.mask ?? new Uint8Array(4 * SHIPHT),
        rotations[actualEndIdx]?.mask ?? new Uint8Array(4 * SHIPHT),
        weight,
        2 * SCENTER,
        4
      )
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
