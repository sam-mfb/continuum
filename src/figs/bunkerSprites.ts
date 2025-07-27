import type { BunkerSprite, BunkerSpriteSet } from './types'
import {
  BunkerKind,
  BUNKKINDS,
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
    [BunkerKind.GROUND]: {},
    [BunkerKind.FOLLOW]: {},
    [BunkerKind.GENERATOR]: {},
    [BunkerKind.DIFFUSION]: [],
    [BunkerKind.WALL]: {} as BunkerSprite // Will be set below
  }

  // Process rotating bunkers (ground, follow, generator)
  for (let kind = 0; kind < BUNKROTKINDS; kind++) {
    const kindSprites = kinds[kind as BunkerKind] as Record<
      number,
      BunkerSprite
    >

    // Initialize all 16 rotations
    for (let rot = 0; rot < BUNKER_ROTATIONS; rot++) {
      kindSprites[rot] = {
        def: new Uint8Array(6 * BUNKHT),
        mask: new Uint8Array(6 * BUNKHT),
        images: {
          background1: new Uint8Array(6 * BUNKHT),
          background2: new Uint8Array(6 * BUNKHT)
        }
      }
    }

    // Copy the first 4 rotations from extracted data
    for (let i = 0; i < 4; i++) {
      const sprite = bunkerArrays[kind]?.[i]
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

    // Generate rotations 4-15 from rotations 0-3
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

  // Process diffusion bunkers (3 variations, no rotation)
  const diffusionSprites = kinds[BunkerKind.DIFFUSION] as BunkerSprite[]
  for (let i = 0; i < 3; i++) {
    const sprite = bunkerArrays[BUNKKINDS]?.[i]
    if (!sprite) continue
    diffusionSprites[i] = {
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

  // Process wall bunker (single static image)
  const wallSprite = bunkerArrays[BunkerKind.WALL]?.[0]
  if (!wallSprite) {
    throw new Error('Wall bunker sprite not found')
  }
  kinds[BunkerKind.WALL] = {
    def: new Uint8Array(wallSprite.def),
    mask: new Uint8Array(wallSprite.mask),
    images: {
      background1: applyBunkerBackground(
        wallSprite.def,
        wallSprite.mask,
        BACKGROUND1
      ),
      background2: applyBunkerBackground(
        wallSprite.def,
        wallSprite.mask,
        BACKGROUND2
      )
    }
  }

  return {
    kinds,

    getSprite(
      kind: BunkerKind,
      rotation: number,
      variation?: number
    ): BunkerSprite {
      switch (kind) {
        case BunkerKind.GROUND:
        case BunkerKind.FOLLOW:
        case BunkerKind.GENERATOR:
          const rotatingKind = kinds[kind] as Record<number, BunkerSprite>
          const rotSprite = rotatingKind[rotation % BUNKER_ROTATIONS]
          if (!rotSprite)
            throw new Error(
              `Bunker sprite not found: ${kind} rotation ${rotation}`
            )
          return rotSprite

        case BunkerKind.DIFFUSION:
          const diffKind = kinds[kind] as BunkerSprite[]
          const idx = variation !== undefined ? variation % 3 : 0
          const diffSprite = diffKind[idx]
          if (!diffSprite)
            throw new Error(
              `Diffusion bunker sprite not found: variation ${idx}`
            )
          return diffSprite

        case BunkerKind.WALL:
          return kinds[kind] as BunkerSprite

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

  // Process in 16-bit words to match original code
  for (let row = 0; row < BUNKHT; row++) {
    const rowOffset = row * 6

    // Determine which background pattern to use for this row
    const bgPattern = row % 2 === 0 ? background : ~background

    // Process 3 16-bit words per row
    for (let word = 0; word < 3; word++) {
      const wordOffset = rowOffset + word * 2

      // Extract 16-bit values
      const defWord = ((def[wordOffset] ?? 0) << 8) | (def[wordOffset + 1] ?? 0)
      const maskWord =
        ((mask[wordOffset] ?? 0) << 8) | (mask[wordOffset + 1] ?? 0)

      // Get appropriate 16 bits from background pattern
      const bgWord = (bgPattern >> (16 - word * 16)) & 0xffff

      // Apply formula: (background & mask) ^ def
      const resultWord = (bgWord & maskWord) ^ defWord

      // Store result
      result[wordOffset] = (resultWord >> 8) & 0xff
      result[wordOffset + 1] = resultWord & 0xff
    }
  }

  return result
}

// Debug helper to visualize a bunker sprite as ASCII art
export function bunkerSpriteToAscii(sprite: BunkerSprite): string {
  const lines: string[] = []

  for (let y = 0; y < BUNKHT; y++) {
    let line = ''
    for (let x = 0; x < 48; x++) {
      const byteIdx = y * 6 + Math.floor(x / 8)
      const bitIdx = 7 - (x % 8)
      const bit = ((sprite.def[byteIdx] ?? 0) >> bitIdx) & 1
      line += bit ? '█' : ' '
    }
    lines.push(line)
  }

  return lines.join('\n')
}
