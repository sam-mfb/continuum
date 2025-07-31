import type { BunkerSprite, BunkerSpriteSet } from './types'
import {
  BunkerKind,
  BUNKROTKINDS,
  BUNKER_ROTATIONS,
  BUNKHT,
  BACKGROUND1,
  BACKGROUND2
} from './types'
import { rotateBunker90CW } from './rotate'

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
        BACKGROUND1
      )
      sprite.images.background2 = applyBunkerBackground(
        sprite.def,
        sprite.mask,
        BACKGROUND2
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
            BACKGROUND1
          ),
          background2: applyBunkerBackground(
            sprite.def,
            sprite.mask,
            BACKGROUND2
          )
        }
      }
    }
  }

  return {
    kinds,

    getSprite(
      kind: BunkerKind,
      rotation: number,
      animationFrame?: number
    ): BunkerSprite {
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
          // Animated bunkers
          const animatedKind = kinds[kind] as BunkerSprite[]
          const frame = animationFrame !== undefined ? animationFrame % 8 : 0
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
  background: number
): Uint8Array {
  const result = new Uint8Array(def.length)

  // Match original C code logic from Figs.c:423-435
  // The original pre-computes: (background & mask) ^ def

  // Process each row (6 bytes = 48 pixels for bunkers)
  // NOTE: Original C code only processes BUNKHT/2 (24) rows, not all 48!
  // This matches the loop: for (k=0; k < BUNKHT/2; k++)
  const rowsToProcess = BUNKHT / 2  // 24 rows
  
  // True checkerboard pattern - each entire row alternates
  // For BACKGROUND1 (align=0): even rows = 0xAA, odd rows = 0x55
  // For BACKGROUND2 (align=1): even rows = 0x55, odd rows = 0xAA
  
  for (let row = 0; row < rowsToProcess; row++) {
    const rowOffset = row * 6
    
    // Determine pattern for this entire row based on row parity
    let rowPattern: number
    if (background === BACKGROUND1) {
      rowPattern = (row % 2 === 0) ? 0xaa : 0x55
    } else {
      rowPattern = (row % 2 === 0) ? 0x55 : 0xaa
    }
    
    // Apply the same pattern to all 6 bytes in the row
    for (let b = 0; b < 6; b++) {
      const idx = rowOffset + b
      result[idx] = (rowPattern & mask[idx]!) ^ def[idx]!
    }
  }

  // The original code only processes 24 rows, leaving the bottom 24 rows
  // as whatever was in the original def data (no background pre-computation)
  // Copy the remaining rows from the original def
  const startByte = rowsToProcess * 6  // 144
  const endByte = BUNKHT * 6  // 288
  for (let i = startByte; i < endByte; i++) {
    result[i] = def[i]!
  }
  
  return result
}
