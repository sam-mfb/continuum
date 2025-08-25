/**
 * @fileoverview Improved sprite service API with pre-computed format conversions
 *
 * This new API provides:
 * - Explicit variant selection (def, mask, background1, background2)
 * - Pre-computed format conversions (Uint8Array, Uint16Array, MonochromeBitmap)
 * - Type-safe variant requests
 * - Simpler, more consistent interface
 */

import { extractAllSprites } from '@/figs'
import { BunkerKind } from '@/figs/types'
import type { AllSprites } from '@/figs/types'
import type { MonochromeBitmap } from '@/bitmap/types'

// Sprite variants - explicit background selection
export type ShipVariant = 'def' | 'mask'
export type FullVariant = 'def' | 'mask' | 'background1' | 'background2'

// All formats pre-computed and returned
export type SpriteData = {
  uint8: Uint8Array
  uint16: Uint16Array
  bitmap: MonochromeBitmap
}

// Options types per sprite type
export type ShipOptions = { variant: ShipVariant }
export type FullOptions = { variant: FullVariant }

// New sprite service interface
export type SpriteServiceV2 = {
  // Ship only has def and mask
  getShipSprite(rotation: number, options: ShipOptions): SpriteData

  // Full variant support (def, mask, background1, background2)
  getBunkerSprite(
    kind: BunkerKind,
    rotation: number,
    options: FullOptions
  ): SpriteData
  getFuelSprite(frame: number, options: FullOptions): SpriteData
  getShardSprite(
    kind: number,
    rotation: number,
    options: FullOptions
  ): SpriteData
  getCraterSprite(options: FullOptions): SpriteData

  // No options - only def variant exists
  getShieldSprite(): SpriteData
  getFlameSprite(frame: number): SpriteData
  getStrafeSprite(rotation: number): SpriteData
  getDigitSprite(char: string): SpriteData | null
}

// Helper function to convert Uint8Array to Uint16Array (big-endian)
export function toUint16Array(data: Uint8Array): Uint16Array {
  const result = new Uint16Array(data.length / 2)
  for (let i = 0; i < result.length; i++) {
    result[i] = (data[i * 2]! << 8) | data[i * 2 + 1]!
  }
  return result
}

// Helper function to convert Uint8Array to MonochromeBitmap
export function toMonochromeBitmap(
  data: Uint8Array,
  width: number,
  height: number
): MonochromeBitmap {
  return {
    data: new Uint8Array(data), // Create a copy
    width,
    height,
    rowBytes: width / 8
  }
}

// Helper function to pre-compute all formats for sprite data
export function precomputeFormats(
  data: Uint8Array,
  width: number,
  height: number
): SpriteData {
  return {
    uint8: data,
    uint16: toUint16Array(data),
    bitmap: toMonochromeBitmap(data, width, height)
  }
}

// Storage for pre-computed sprite data
type PrecomputedStorage = {
  ship: Map<string, SpriteData> // key: "rotation-variant"
  bunker: Map<string, SpriteData> // key: "kind-rotation-variant"
  fuel: Map<string, SpriteData> // key: "frame-variant"
  shard: Map<string, SpriteData> // key: "kind-rotation-variant"
  crater: Map<string, SpriteData> // key: "variant"
  shield: SpriteData
  flame: Map<number, SpriteData> // key: frame
  strafe: Map<number, SpriteData> // key: rotation
  digit: Map<string, SpriteData> // key: character
}

/**
 * Creates an improved sprite service with pre-computed format conversions
 */
export async function createSpriteServiceV2(): Promise<SpriteServiceV2> {
  // Load sprite resource file
  const response = await fetch('/src/assets/graphics/rsrc_260.bin')
  if (!response.ok) {
    throw new Error('Failed to load sprite resource')
  }

  const arrayBuffer = await response.arrayBuffer()
  const allSprites = extractAllSprites(arrayBuffer)

  // Pre-compute all sprite data at initialization
  const storage = precomputeAllSprites(allSprites)

  // Return the service implementation
  return {
    getShipSprite(rotation: number, options: ShipOptions): SpriteData {
      const key = `${rotation}-${options.variant}`
      const data = storage.ship.get(key)
      if (!data) {
        throw new Error(
          `Ship sprite not found: rotation=${rotation}, variant=${options.variant}`
        )
      }
      return data
    },

    getBunkerSprite(
      kind: BunkerKind,
      rotationOrFrame: number,
      options: FullOptions
    ): SpriteData {
      const key = `${kind}-${rotationOrFrame}-${options.variant}`
      const data = storage.bunker.get(key)
      if (!data) {
        throw new Error(
          `Bunker sprite not found: kind=${kind}, rotation=${rotationOrFrame}, variant=${options.variant}`
        )
      }
      return data
    },

    getFuelSprite(frame: number, options: FullOptions): SpriteData {
      const key = `${frame}-${options.variant}`
      const data = storage.fuel.get(key)
      if (!data) {
        throw new Error(
          `Fuel sprite not found: frame=${frame}, variant=${options.variant}`
        )
      }
      return data
    },

    getShardSprite(
      kind: number,
      rotation: number,
      options: FullOptions
    ): SpriteData {
      const key = `${kind}-${rotation}-${options.variant}`
      const data = storage.shard.get(key)
      if (!data) {
        throw new Error(
          `Shard sprite not found: kind=${kind}, rotation=${rotation}, variant=${options.variant}`
        )
      }
      return data
    },

    getCraterSprite(options: FullOptions): SpriteData {
      const data = storage.crater.get(options.variant)
      if (!data) {
        throw new Error(`Crater sprite not found: variant=${options.variant}`)
      }
      return data
    },

    getShieldSprite(): SpriteData {
      return storage.shield
    },

    getFlameSprite(frame: number): SpriteData {
      const data = storage.flame.get(frame)
      if (!data) {
        throw new Error(`Flame sprite not found: frame=${frame}`)
      }
      return data
    },

    getStrafeSprite(rotation: number): SpriteData {
      const data = storage.strafe.get(rotation)
      if (!data) {
        throw new Error(`Strafe sprite not found: rotation=${rotation}`)
      }
      return data
    },

    getDigitSprite(char: string): SpriteData | null {
      return storage.digit.get(char) || null
    }
  }
}

/**
 * Pre-compute all sprite data for performance
 */
function precomputeAllSprites(allSprites: AllSprites): PrecomputedStorage {
  const storage: PrecomputedStorage = {
    ship: new Map(),
    bunker: new Map(),
    fuel: new Map(),
    shard: new Map(),
    crater: new Map(),
    shield: precomputeFormats(allSprites.shield.def, 32, 22), // Shield is 32x22
    flame: new Map(),
    strafe: new Map(),
    digit: new Map()
  }

  // Pre-compute ship sprites (32 rotations, def and mask variants)
  for (let rotation = 0; rotation < 32; rotation++) {
    const sprite = allSprites.ships.getRotationIndex(rotation)
    storage.ship.set(`${rotation}-def`, precomputeFormats(sprite.def, 32, 32))
    storage.ship.set(`${rotation}-mask`, precomputeFormats(sprite.mask, 32, 32))
  }

  // Pre-compute bunker sprites
  for (const [, kindValue] of Object.entries(BunkerKind)) {
    if (typeof kindValue !== 'number') continue
    const kind = kindValue as BunkerKind

    if (kind === BunkerKind.WALL || kind === BunkerKind.DIFF) {
      // Rotating bunkers: 16 rotations
      for (let rotation = 0; rotation < 16; rotation++) {
        const sprite = allSprites.bunkers.getSprite(kind, rotation)
        storage.bunker.set(
          `${kind}-${rotation}-def`,
          precomputeFormats(sprite.def, 48, 48)
        )
        storage.bunker.set(
          `${kind}-${rotation}-mask`,
          precomputeFormats(sprite.mask, 48, 48)
        )
        storage.bunker.set(
          `${kind}-${rotation}-background1`,
          precomputeFormats(sprite.images.background1, 48, 48)
        )
        storage.bunker.set(
          `${kind}-${rotation}-background2`,
          precomputeFormats(sprite.images.background2, 48, 48)
        )
      }
    } else {
      // Animated bunkers: 8 frames
      for (let frame = 0; frame < 8; frame++) {
        const sprite = allSprites.bunkers.getSprite(kind, 0, frame)
        storage.bunker.set(
          `${kind}-${frame}-def`,
          precomputeFormats(sprite.def, 48, 48)
        )
        storage.bunker.set(
          `${kind}-${frame}-mask`,
          precomputeFormats(sprite.mask, 48, 48)
        )
        storage.bunker.set(
          `${kind}-${frame}-background1`,
          precomputeFormats(sprite.images.background1, 48, 48)
        )
        storage.bunker.set(
          `${kind}-${frame}-background2`,
          precomputeFormats(sprite.images.background2, 48, 48)
        )
      }
    }
  }

  // Pre-compute fuel sprites (9 frames including empty)
  for (let frame = 0; frame < 9; frame++) {
    const sprite =
      frame === 8
        ? allSprites.fuels.emptyCell
        : allSprites.fuels.getFrame(frame)
    storage.fuel.set(`${frame}-def`, precomputeFormats(sprite.def, 32, 32))
    storage.fuel.set(`${frame}-mask`, precomputeFormats(sprite.mask, 32, 32))
    storage.fuel.set(
      `${frame}-background1`,
      precomputeFormats(sprite.images.background1, 32, 32)
    )
    storage.fuel.set(
      `${frame}-background2`,
      precomputeFormats(sprite.images.background2, 32, 32)
    )
  }

  // Pre-compute shard sprites (7 kinds, 16 rotations each)
  for (let kind = 0; kind < 7; kind++) {
    for (let rotation = 0; rotation < 16; rotation++) {
      const sprite = allSprites.shards.getSprite(kind, rotation)
      storage.shard.set(
        `${kind}-${rotation}-def`,
        precomputeFormats(sprite.def, 16, 16)
      )
      storage.shard.set(
        `${kind}-${rotation}-mask`,
        precomputeFormats(sprite.mask, 16, 16)
      )
      storage.shard.set(
        `${kind}-${rotation}-background1`,
        precomputeFormats(sprite.images.background1, 16, 16)
      )
      storage.shard.set(
        `${kind}-${rotation}-background2`,
        precomputeFormats(sprite.images.background2, 16, 16)
      )
    }
  }

  // Pre-compute crater sprite
  storage.crater.set('def', precomputeFormats(allSprites.crater.def, 32, 32))
  storage.crater.set('mask', precomputeFormats(allSprites.crater.mask, 32, 32))
  storage.crater.set(
    'background1',
    precomputeFormats(allSprites.crater.images.background1, 32, 32)
  )
  storage.crater.set(
    'background2',
    precomputeFormats(allSprites.crater.images.background2, 32, 32)
  )

  // Pre-compute flame sprites
  for (let frame = 0; frame < allSprites.flames.frames.length; frame++) {
    const flameData = allSprites.flames.getFrame(frame)
    storage.flame.set(
      frame,
      precomputeFormats(flameData.def, flameData.width, flameData.height)
    )
  }

  // Pre-compute strafe sprites (16 rotations)
  for (let rotation = 0; rotation < 16; rotation++) {
    const strafeData = allSprites.strafe.getFrame(rotation)
    // Strafe sprites are 8x8
    storage.strafe.set(rotation, precomputeFormats(strafeData, 8, 8))
  }

  // Pre-compute digit sprites (0-9, A-Z, SHIP, SPACE)
  // Numbers 0-9
  for (let i = 0; i <= 9; i++) {
    const char = i.toString()
    const digitData = allSprites.digits.getCharacter(char)
    if (digitData) {
      storage.digit.set(char, precomputeFormats(digitData, 8, 9))
    }
  }
  
  // Letters A-Z
  for (let i = 0; i < 26; i++) {
    const char = String.fromCharCode('A'.charCodeAt(0) + i)
    const digitData = allSprites.digits.getCharacter(char)
    if (digitData) {
      storage.digit.set(char, precomputeFormats(digitData, 8, 9))
    }
  }
  
  // Special characters
  const shipData = allSprites.digits.getCharacter('SHIP')
  if (shipData) {
    storage.digit.set('SHIP', precomputeFormats(shipData, 8, 9))
  }
  
  const spaceData = allSprites.digits.getCharacter(' ')
  if (spaceData) {
    storage.digit.set(' ', precomputeFormats(spaceData, 8, 9))
  }

  return storage
}
