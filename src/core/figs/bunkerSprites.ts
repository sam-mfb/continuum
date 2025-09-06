import type { BunkerSprite, BunkerSpriteSet } from './types'
import { BunkerKind, BUNKROTKINDS, BUNKER_ROTATIONS, BUNKHT } from './types'
import { rotateBunker90CW } from './rotate'
import { getBackgroundPattern } from '@core/shared'
import type { Alignment } from '@core/shared'

// Create a bunker sprite set from extracted arrays
export function createBunkerSpriteSet(
  bunkerArrays: BunkerSprite[][]
): BunkerSpriteSet {
  const kinds: BunkerSpriteSet['kinds'] = {
    [BunkerKind.WALL]: {}, // Will be filled with 16 rotations
    [BunkerKind.DIFF]: {}, // Will be filled with 16 rotations
    [BunkerKind.GROUND]: [], // Will be filled with 8 animation frames
    [BunkerKind.FOLLOW]: [], // Will be filled with 8 animation frames
    [BunkerKind.GENERATOR]: [] // Will be filled with 8 animation frames
  }

  // Process rotating bunkers (Wall, Diff)
  for (let kind = 0; kind < BUNKROTKINDS; kind++) {
    const kindSprites = kinds[kind as BunkerKind] as Record<
      number,
      BunkerSprite
    >
    const sourceArray = bunkerArrays[kind]
    if (!sourceArray) continue

    // Copy the 4 base images
    for (let i = 0; i < 4; i++) {
      const sprite = sourceArray[i]
      if (!sprite) continue
      kindSprites[i] = {
        def: new Uint8Array(sprite.def),
        mask: new Uint8Array(sprite.mask),
        images: {
          background1: new Uint8Array(6 * BUNKHT),
          background2: new Uint8Array(6 * BUNKHT)
        }
      }
    }

    // Generate rotations 4-15 using the rotateBunker algorithm
    // The C code does: for (i=4; i<16; i++) { old = defs[k][i-4]; new = defs[k][i]; }
    for (let i = 4; i < BUNKER_ROTATIONS; i++) {
      const sourceIdx = i - 4
      const sourceSprite = kindSprites[sourceIdx]
      if (!sourceSprite) continue

      kindSprites[i] = {
        def: rotateBunker90CW(sourceSprite.def),
        mask: rotateBunker90CW(sourceSprite.mask),
        images: {
          background1: new Uint8Array(6 * BUNKHT),
          background2: new Uint8Array(6 * BUNKHT)
        }
      }
    }

    // Pre-compute background images for all rotations
    for (let rot = 0; rot < BUNKER_ROTATIONS; rot++) {
      const sprite = kindSprites[rot]
      if (!sprite) continue
      sprite.images.background1 = applyBunkerBackground(
        sprite.def,
        sprite.mask,
        0 // alignment 0
      )
      sprite.images.background2 = applyBunkerBackground(
        sprite.def,
        sprite.mask,
        1 // alignment 1
      )
    }
  }

  // Process animated bunkers (Ground, Follow, Generator)
  for (let kind = BunkerKind.GROUND; kind <= BunkerKind.GENERATOR; kind++) {
    const kindSprites = kinds[kind] as BunkerSprite[]
    const sourceArray = bunkerArrays[kind]
    if (!sourceArray) continue

    // Copy all 8 animation frames
    for (let frame = 0; frame < 8; frame++) {
      const sprite = sourceArray[frame]
      if (!sprite) continue
      kindSprites[frame] = {
        def: new Uint8Array(sprite.def),
        mask: new Uint8Array(sprite.mask),
        images: {
          background1: applyBunkerBackground(
            sprite.def,
            sprite.mask,
            0 // alignment 0
          ),
          background2: applyBunkerBackground(
            sprite.def,
            sprite.mask,
            1 // alignment 1
          )
        }
      }
    }
  }

  return {
    kinds,

    getSprite(kind: BunkerKind, rotation: number): BunkerSprite {
      switch (kind) {
        case BunkerKind.WALL:
        case BunkerKind.DIFF:
          // Rotating bunkers
          const rotatingKind = kinds[kind] as Record<number, BunkerSprite>
          const rotSprite = rotatingKind[rotation % BUNKER_ROTATIONS]
          if (!rotSprite)
            throw new Error(
              `Bunker sprite not found: ${kind} rotation ${rotation}`
            )
          return rotSprite

        case BunkerKind.GROUND:
        case BunkerKind.FOLLOW:
        case BunkerKind.GENERATOR:
          // Animated bunkers - for these, rotation IS the animation frame
          const animatedKind = kinds[kind] as BunkerSprite[]
          const frame = rotation % 8
          const animSprite = animatedKind[frame]
          if (!animSprite)
            throw new Error(`Bunker sprite not found: ${kind} frame ${frame}`)
          return animSprite

        default:
          throw new Error(`Unknown bunker kind: ${kind}`)
      }
    }
  }
}

// Apply background pattern to bunker sprite
function applyBunkerBackground(
  def: Uint8Array,
  mask: Uint8Array,
  initialAlignment: 0 | 1
): Uint8Array {
  const result = new Uint8Array(def.length)

  // Match original C code logic from Figs.c:423-435
  // The original pre-computes: (background & mask) ^ def

  // Process ALL rows (48 rows for bunkers)
  // True checkerboard pattern - each entire row alternates
  // For initialAlignment 0: even rows = pattern0, odd rows = pattern1
  // For initialAlignment 1: even rows = pattern1, odd rows = pattern0

  for (let row = 0; row < BUNKHT; row++) {
    const rowOffset = row * 6

    // Simply alternate patterns based on row parity and initial alignment
    // This is NOT a position calculation, just picking alternating patterns
    const rowAlign = (initialAlignment + row) % 2 === 0 ? 0 : 1
    const rowBg = getBackgroundPattern(rowAlign as Alignment)
    const rowPattern = (rowBg >> 24) & 0xff // Use most significant byte

    // Apply the same pattern to all 6 bytes in the row
    for (let b = 0; b < 6; b++) {
      const idx = rowOffset + b
      result[idx] = (rowPattern & mask[idx]!) ^ def[idx]!
    }
  }

  return result
}
