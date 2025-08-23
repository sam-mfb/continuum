import type { ShardSprite, ShardSpriteSet } from './types'
import { SHARDKINDS, SHARDHT } from './types'
import { getAlignment } from '@/shared/alignment'
import { getBackgroundPattern } from '@/shared/backgroundPattern'

// Create a shard sprite set from extracted arrays
export function createShardSpriteSet(
  shardArrays: ShardSprite[][]
): ShardSpriteSet {
  const kinds: Record<number, Record<number, ShardSprite>> = {}

  // Initialize all kinds
  for (let kind = 0; kind < SHARDKINDS; kind++) {
    kinds[kind] = {}

    // Initialize all 16 rotations for this kind
    const kindRotations = kinds[kind]
    if (!kindRotations) continue
    for (let rot = 0; rot < 16; rot++) {
      kindRotations[rot] = {
        def: new Uint8Array(2 * SHARDHT),
        mask: new Uint8Array(2 * SHARDHT),
        images: {
          background1: new Uint8Array(2 * SHARDHT),
          background2: new Uint8Array(2 * SHARDHT)
        }
      }
    }

    // Copy the first 4 rotations from extracted data
    for (let i = 0; i < 4; i++) {
      const sprite = shardArrays[kind]?.[i]
      if (!sprite) continue

      kindRotations[i] = {
        def: new Uint8Array(sprite.def),
        mask: new Uint8Array(sprite.mask),
        images: {
          background1: new Uint8Array(2 * SHARDHT),
          background2: new Uint8Array(2 * SHARDHT)
        }
      }
    }

    // Generate rotations 4-15 by rotating previous sprites by 90 degrees
    // Based on the rotation algorithm in extract_shards()
    // This creates: 0→4, 1→5, 2→6, 3→7, 4→8, 5→9, 6→10, 7→11, 8→12, 9→13, 10→14, 11→15
    for (let i = 4; i < 16; i++) {
      const source = kindRotations[i - 4]
      if (!source) continue
      const rotated = rotateShardBy90(source)
      kindRotations[i] = rotated
    }

    // Pre-compute background images for ALL rotations (including rotated ones)
    for (let rot = 0; rot < 16; rot++) {
      const sprite = kinds[kind]?.[rot]
      if (!sprite) continue

      // Shards use alternating background alignment
      for (let align = 0; align < 2; align++) {
        const target =
          align === 0 ? sprite.images.background1 : sprite.images.background2

        for (let y = 0; y < SHARDHT; y++) {
          // Select background based on (y + align) & 1, matching original
          const rowAlign = getAlignment({ x: 0, y: y + align })
          const rowBg = getBackgroundPattern(rowAlign)
          const bgByte = (rowBg >> 16) & 0xffff // Use middle 16 bits

          // Process 2 bytes per row
          for (let byte = 0; byte < 2; byte++) {
            const idx = y * 2 + byte
            const bgValue = (bgByte >> ((1 - byte) * 8)) & 0xff
            const maskByte = sprite.mask[idx] ?? 0
            const defByte = sprite.def[idx] ?? 0
            target[idx] = (bgValue & maskByte) ^ defByte
          }
        }
      }
    }
  }

  return {
    kinds,

    getSprite(kind: number, rotation: number): ShardSprite {
      const k = kind % SHARDKINDS
      const r = rotation % 16
      const sprite = kinds[k]?.[r]
      if (!sprite)
        throw new Error(`Shard sprite not found: kind ${k} rotation ${r}`)
      return sprite
    }
  }
}

// Rotate a shard sprite by 90 degrees
// Based on the algorithm from extract_shards() in Figs.c
function rotateShardBy90(source: ShardSprite): ShardSprite {
  const dest: ShardSprite = {
    def: new Uint8Array(2 * SHARDHT),
    mask: new Uint8Array(2 * SHARDHT),
    images: {
      background1: new Uint8Array(2 * SHARDHT),
      background2: new Uint8Array(2 * SHARDHT)
    }
  }

  // Rotate both def and mask
  rotateShard16x16(source.def, dest.def)
  rotateShard16x16(source.mask, dest.mask)

  return dest
}

// Rotate a 16x16 shard bitmap by 90 degrees
function rotateShard16x16(src: Uint8Array, dest: Uint8Array): void {
  // Based on the inner loop from extract_shards:
  // to[y] |= (unsigned) ((from[(SHARDHT-1)-x] << y) & 0x8000) >> x

  for (let y = 0; y < SHARDHT; y++) {
    let value = 0

    for (let x = 0; x < SHARDHT; x++) {
      // Get the 16-bit value from source row (SHARDHT-1-x)
      const srcRow = SHARDHT - 1 - x
      const srcWord = (src[srcRow * 2]! << 8) | src[srcRow * 2 + 1]!

      // Extract bit y from this row (the original does: (from[row] << y) & 0x8000)
      // This tests if bit (15-y) is set in the source word
      if ((srcWord << y) & 0x8000) {
        // Set bit x in destination row y
        value |= 0x8000 >> x
      }
    }

    // Store the 16-bit value
    dest[y * 2] = (value >> 8) & 0xff
    dest[y * 2 + 1] = value & 0xff
  }
}

// Debug helper to visualize a shard sprite as ASCII art
export function shardSpriteToAscii(sprite: ShardSprite): string {
  const lines: string[] = []

  for (let y = 0; y < SHARDHT; y++) {
    let line = ''
    for (let x = 0; x < 16; x++) {
      const byteIdx = y * 2 + Math.floor(x / 8)
      const bitIdx = 7 - (x % 8)
      const bit = ((sprite.def[byteIdx] ?? 0) >> bitIdx) & 1
      line += bit ? '█' : ' '
    }
    lines.push(line)
  }

  return lines.join('\n')
}

// Get appropriate background image based on y position and alignment
export function getShardBackground(
  sprite: ShardSprite,
  yPosition: number,
  alignment: number // 0 or 1 for sub-pixel alignment
): Uint8Array {
  // Shards consider both position and alignment for background selection
  const bgIndex = (yPosition + alignment) & 1
  return bgIndex === 0 ? sprite.images.background1 : sprite.images.background2
}
