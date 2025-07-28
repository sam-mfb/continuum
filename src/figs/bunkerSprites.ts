import type { BunkerSprite, BunkerSpriteSet } from './types'
import {
  BunkerKind,
  BUNKROTKINDS,
  BUNKER_ROTATIONS,
  BUNKHT,
  BACKGROUND1,
  BACKGROUND2
} from './types'
import { rotateBunker } from './rotate'

// Create a bunker sprite set from extracted arrays
export function createBunkerSpriteSet(
  bunkerArrays: BunkerSprite[][]
): BunkerSpriteSet {
  const kinds: BunkerSpriteSet['kinds'] = {
    [BunkerKind.WALL]: {},      // Will be filled with 16 rotations
    [BunkerKind.DIFF]: {},      // Will be filled with 16 rotations
    [BunkerKind.GROUND]: [],    // Will be filled with 8 animation frames
    [BunkerKind.FOLLOW]: [],    // Will be filled with 8 animation frames
    [BunkerKind.GENERATOR]: []  // Will be filled with 8 animation frames
  }

  // Process rotating bunkers (Wall, Diff)
  for (let kind = 0; kind < BUNKROTKINDS; kind++) {
    const kindSprites = kinds[kind as BunkerKind] as Record<number, BunkerSprite>
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
    for (let i = 4; i < BUNKER_ROTATIONS; i++) {
      const sourceRotation = i - 4
      const sourceSprite = kindSprites[sourceRotation]
      if (!sourceSprite) continue
      kindSprites[i] = {
        def: rotateBunker(sourceSprite.def, sourceRotation),
        mask: rotateBunker(sourceSprite.mask, sourceRotation),
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
          background2: applyBunkerBackground(sprite.def, sprite.mask, BACKGROUND2)
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
            throw new Error(
              `Bunker sprite not found: ${kind} frame ${frame}`
            )
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

  // Process as 16-bit values (2 bytes at a time)
  for (let i = 0; i < def.length; i += 2) {
    // Combine two bytes into a 16-bit value (big-endian)
    const defValue = (def[i]! << 8) | (def[i + 1] ?? 0)
    const maskValue = (mask[i]! << 8) | (mask[i + 1] ?? 0)

    // Apply formula: (background & mask) ^ def
    const resultValue = (background & maskValue) ^ defValue

    // Split back into two bytes
    result[i] = (resultValue >> 8) & 0xff
    result[i + 1] = resultValue & 0xff
  }

  return result
}