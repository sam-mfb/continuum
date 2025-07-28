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
  FUEL_TOTAL_FRAMES,
  SHARDKINDS,
  BUNKROTKINDS,
  BunkerKind,
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
import { 
  createFlameSpriteSet, 
  createStrafeSpriteSet, 
  createDigitSpriteSet 
} from './hardcodedSpriteSet'

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
      copyBitmapRegion(bitmap, 512, sprite.mask, x - 1, y - 1, 32, 32, 4)
      baseShips[i] = sprite
    } else if (i < 10) {
      // Next 5 are defs
      const sprite = baseShips[i - 5]
      if (!sprite) continue
      copyBitmapRegion(bitmap, 512, sprite.def, x - 1, y - 1, 32, 32, 4)
    } else {
      // Last one is shield
      const shieldDef = new Uint8Array(4 * SHIPHT)
      copyBitmapRegion(bitmap, 512, shieldDef, x - 1, y - 1, 32, 32, 4)
      shield = shieldDef
    }
  }

  return { baseShips, shield: shield! }
}

// Extract bunker sprites from the figure resource
function extractBunkers(bitmap: Uint8Array): BunkerSprite[][] {
  const bunkers: BunkerSprite[][] = []
  
  // The resource layout matches the original C code:
  // Row 0: Wall (4 defs followed by 4 masks)
  // Row 1: Diff (4 defs followed by 4 masks)
  // Row 2: Ground defs (8 frames)
  // Row 3: Ground masks (8 frames)
  // Row 4: Follow defs (8 frames)
  // Row 5: Follow masks (8 frames)
  // Row 6: Generator defs (8 frames)
  // Row 7: Generator masks (8 frames)
  
  const totalRows = 8 // BUNKKINDS + 3 from the C code
  
  // First pass: Extract all the raw data
  const rawData: BunkerSprite[][] = []
  for (let row = 0; row < totalRows; row++) {
    rawData[row] = []
    
    for (let i = 0; i < 8; i++) {
      const sprite = createBunkerSprite()
      const x = i * 48 + 1
      const y = row * 48 + 1
      
      if (row < BUNKROTKINDS) {
        // Rotating bunkers: first 4 are defs, next 4 are masks
        if (i < 4) {
          copyBitmapRegion(bitmap, 512, sprite.def, x, y, 46, BUNKHT - 2, 6)
        } else {
          // Copy mask to the corresponding def sprite
          const defSprite = rawData[row]?.[i - 4]
          if (defSprite) {
            copyBitmapRegion(bitmap, 512, defSprite.mask, x, y, 46, BUNKHT - 2, 6)
          }
          continue
        }
      } else {
        // Animated bunkers: entire row is either all defs or all masks
        const isDefRow = (row % 2) === 0
        if (isDefRow) {
          copyBitmapRegion(bitmap, 512, sprite.def, x, y, 46, BUNKHT - 2, 6)
        } else {
          copyBitmapRegion(bitmap, 512, sprite.mask, x, y, 46, BUNKHT - 2, 6)
        }
      }
      
      rawData[row]![i] = sprite
    }
  }
  
  // Second pass: Organize into the final structure
  // Type 0: Wall (rotating) - just copy the 4 base sprites
  bunkers[BunkerKind.WALL] = rawData[0]!.slice(0, 4)
  
  // Type 1: Diff (rotating) - just copy the 4 base sprites  
  bunkers[BunkerKind.DIFF] = rawData[1]!.slice(0, 4)
  
  // Types 2-4: Animated bunkers (Ground, Follow, Generator)
  // Each has 8 animation frames
  for (let bunkerType = 0; bunkerType < 3; bunkerType++) {
    const kind = bunkerType + 2 // Maps to BunkerKind.GROUND, FOLLOW, GENERATOR
    bunkers[kind] = []
    
    // From the C code: for j >= BUNKROTKINDS, it uses ((j & 1) ? masks : defs)[j/2 + 1][i]
    // j=2: defs[2] (Ground defs), j=3: masks[2] (Ground masks)
    // j=4: defs[3] (Follow defs), j=5: masks[3] (Follow masks)
    // j=6: defs[4] (Generator defs), j=7: masks[4] (Generator masks)
    const defRow = 2 + bunkerType * 2
    const maskRow = defRow + 1
    
    for (let frame = 0; frame < 8; frame++) {
      const sprite = createBunkerSprite()
      
      // Get the def and mask for this frame
      const defSprite = rawData[defRow]?.[frame]
      const maskSprite = rawData[maskRow]?.[frame]
      
      if (defSprite?.def) sprite.def = new Uint8Array(defSprite.def)
      if (maskSprite?.mask) sprite.mask = new Uint8Array(maskSprite.mask)
      
      bunkers[kind]!.push(sprite)
    }
  }
  
  return bunkers
}

// Extract fuel sprites from the figure resource
function extractFuels(bitmap: Uint8Array): FuelSprite[] {
  const fuels: FuelSprite[] = []

  // Extract all 9 fuel sprites (6 normal + 2 draining + 1 empty)
  for (let j = 0; j < 2; j++) {
    for (let i = 0; i < FUEL_TOTAL_FRAMES; i++) {
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
    CRATER_LEFT,
    CRATER_TOP,
    32,
    32,
    4
  )

  // Crater mask
  copyBitmapRegion(
    bitmap,
    512,
    crater.mask,
    CRATER_LEFT + 32,
    CRATER_TOP,
    32,
    32,
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
    shield: { def: shield },
    // Add hardcoded sprites
    flames: createFlameSpriteSet(),
    strafe: createStrafeSpriteSet(),
    digits: createDigitSpriteSet()
  }
}
