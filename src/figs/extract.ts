import { expandTitlePage } from '@/art/utils'
import type {
  AllSprites,
  ShipSprite,
  BunkerSprite,
  FuelSprite,
  ShardSprite
} from './types'
import {
  SHIP_TOP,
  FUEL_TOP,
  SHARD_TOP,
  CRATER_TOP,
  CRATER_LEFT,
  SHIPHT,
  BUNKHT,
  FUELHT,
  SHARDHT,
  CRATERHT,
  BUNKKINDS,
  FUELFRAMES,
  SHARDKINDS,
  createShipSprite,
  createBunkerSprite,
  createFuelSprite,
  createShardSprite,
  createCraterSprite
} from './types'
import { createShipSpriteSet } from './shipSprites'
import { createBunkerSpriteSet } from './bunkerSprites'
import { createFuelSpriteSet } from './fuelSprites'
import { createShardSpriteSet } from './shardSprites'
import { processCraterSprite } from './craterSprites'

// Copy a rectangular region from source bitmap to destination array
function copyBitmapRegion(
  source: Uint8Array,
  sourceWidth: number,
  destArray: Uint8Array,
  x: number,
  y: number,
  width: number,
  height: number,
  destRowBytes: number
): void {
  const sourceBytesPerRow = sourceWidth / 8
  const destBytesPerRow = destRowBytes
  const copyBytes = width / 8

  for (let row = 0; row < height; row++) {
    const sourceOffset = (y + row) * sourceBytesPerRow + Math.floor(x / 8)
    const destOffset = row * destBytesPerRow

    for (let i = 0; i < copyBytes; i++) {
      destArray[destOffset + i] = source[sourceOffset + i] ?? 0
    }
  }
}

// Extract ship sprites from the figure resource
function extractShips(bitmap: Uint8Array): {
  baseShips: ShipSprite[]
  shield: Uint8Array
} {
  const baseShips: ShipSprite[] = []
  let shield: Uint8Array | null = null

  // Extract 11 images: 5 masks, 5 defs, 1 shield
  for (let i = 0; i < 11; i++) {
    const x = i * 32 + 1 // +1 for the 1-pixel border in torect
    const y = SHIP_TOP + 1

    if (i < 5) {
      // First 5 are masks
      const sprite = createShipSprite()
      copyBitmapRegion(bitmap, 512, sprite.mask, x, y, 30, SHIPHT - 2, 4)
      baseShips[i] = sprite
    } else if (i < 10) {
      // Next 5 are defs
      const sprite = baseShips[i - 5]
      if (!sprite) continue
      copyBitmapRegion(bitmap, 512, sprite.def, x, y, 30, SHIPHT - 2, 4)
    } else {
      // Last one is shield
      const shieldDef = new Uint8Array(4 * SHIPHT)
      copyBitmapRegion(bitmap, 512, shieldDef, x, y, 30, SHIPHT - 2, 4)
      shield = shieldDef
    }
  }

  return { baseShips, shield: shield! }
}

// Extract bunker sprites from the figure resource
function extractBunkers(bitmap: Uint8Array): BunkerSprite[][] {
  const bunkers: BunkerSprite[][] = []

  for (let kind = 0; kind < BUNKKINDS + 3; kind++) {
    bunkers[kind] = []
    const kindBunkers = bunkers[kind]!

    for (let i = 0; i < 8; i++) {
      const sprite = createBunkerSprite()
      const y = kind * 48 + 1 // +1 for border

      if (kind < BUNKKINDS) {
        // Regular bunkers: 4 defs then 4 masks
        const x = i * 48 + 1
        if (i < 4) {
          copyBitmapRegion(bitmap, 512, sprite.def, x, y, 46, BUNKHT - 2, 6)
        } else {
          const baseSprite = kindBunkers[i - 4]
          if (!baseSprite) continue
          copyBitmapRegion(
            bitmap,
            512,
            baseSprite.mask,
            x,
            y,
            46,
            BUNKHT - 2,
            6
          )
          kindBunkers[i - 4] = baseSprite
          continue
        }
      } else {
        // Diffusion bunkers alternating def/mask
        const isDef = (kind - BUNKKINDS) % 2 === 0
        const x = i * 48 + 1

        if (isDef) {
          copyBitmapRegion(bitmap, 512, sprite.def, x, y, 46, BUNKHT - 2, 6)
        } else {
          copyBitmapRegion(bitmap, 512, sprite.mask, x, y, 46, BUNKHT - 2, 6)
        }
      }

      kindBunkers[i] = sprite
    }
  }

  // Reorganize diffusion bunkers
  const diffBunkers: BunkerSprite[] = []
  for (let i = 0; i < 3; i++) {
    const defKind = BUNKKINDS + i * 2
    const maskKind = BUNKKINDS + i * 2 + 1
    for (let j = 0; j < 4; j++) {
      const sprite = createBunkerSprite()
      sprite.def = bunkers[defKind]?.[j]?.def ?? new Uint8Array(6 * BUNKHT)
      sprite.mask = bunkers[maskKind]?.[j]?.mask ?? new Uint8Array(6 * BUNKHT)
      diffBunkers.push(sprite)
    }
  }

  // Replace with reorganized data
  bunkers[BUNKKINDS] = diffBunkers
  bunkers.length = BUNKKINDS + 1

  return bunkers
}

// Extract fuel sprites from the figure resource
function extractFuels(bitmap: Uint8Array): FuelSprite[] {
  const fuels: FuelSprite[] = []

  // Extract masks and defs
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < FUELFRAMES + 1; i++) {
      const x = i * 48
      const y = j * 48 + FUEL_TOP

      if (j === 0) {
        // First row is defs
        const sprite = createFuelSprite()
        copyBitmapRegion(bitmap, 512, sprite.def, x, y, 32, FUELHT, 4)
        fuels[i] = sprite
      } else {
        // Second row is masks
        const sprite = fuels[i]
        if (!sprite) continue
        copyBitmapRegion(bitmap, 512, sprite.mask, x, y, 32, FUELHT, 4)
      }
    }
  }

  return fuels
}

// Extract shard sprites from the figure resource
function extractShards(bitmap: Uint8Array): ShardSprite[][] {
  const shards: ShardSprite[][] = []

  for (let kind = 0; kind < SHARDKINDS; kind++) {
    shards[kind] = []
    const kindShards = shards[kind]!

    for (let i = 0; i < 8; i++) {
      const x = i * 16
      const y = SHARD_TOP + kind * SHARDHT

      if (i < 4) {
        // First 4 are defs
        const sprite = createShardSprite()
        copyBitmapRegion(bitmap, 512, sprite.def, x, y, 16, SHARDHT - 1, 2)
        if (shards[kind]) {
          kindShards[i] = sprite
        }
      } else {
        // Next 4 are masks
        const sprite = kindShards[i - 4]
        if (!sprite) continue
        copyBitmapRegion(bitmap, 512, sprite.mask, x, y, 16, SHARDHT - 1, 2)
      }
    }
  }

  return shards
}

// Extract crater sprite from the figure resource
function extractCrater(bitmap: Uint8Array): {
  def: Uint8Array
  mask: Uint8Array
} {
  const crater = createCraterSprite()

  // Crater def
  copyBitmapRegion(
    bitmap,
    512,
    crater.def,
    CRATER_LEFT + 1,
    CRATER_TOP + 1,
    30,
    CRATERHT - 2,
    4
  )

  // Crater mask
  copyBitmapRegion(
    bitmap,
    512,
    crater.mask,
    CRATER_LEFT + 32 + 1,
    CRATER_TOP + 1,
    30,
    CRATERHT - 2,
    4
  )

  return crater
}

// Main extraction function that processes the M_FIGS resource
export function extractAllSprites(figData: ArrayBuffer): AllSprites {
  // Decompress the resource (684 lines for M_FIGS)
  const bitmap = expandTitlePage(figData, 684)

  // Extract all sprite types
  const { baseShips, shield } = extractShips(bitmap)
  const bunkerArrays = extractBunkers(bitmap)
  const fuelArrays = extractFuels(bitmap)
  const shardArrays = extractShards(bitmap)
  const crater = extractCrater(bitmap)

  // Create organized sprite sets
  return {
    ships: createShipSpriteSet(baseShips),
    bunkers: createBunkerSpriteSet(bunkerArrays),
    fuels: createFuelSpriteSet(fuelArrays),
    shards: createShardSpriteSet(shardArrays),
    crater: processCraterSprite(crater.def, crater.mask),
    shield: { def: shield }
  }
}
