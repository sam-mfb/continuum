// Sprite dimensions from GW.h
export const SHIPHT = 32
export const BUNKHT = 48
export const FUELHT = 32
export const SHARDHT = 16
export const CRATERHT = 32
export const SCENTER = 15

// Bunker kinds
export enum BunkerKind {
  GROUND = 0,
  FOLLOW = 1,
  GENERATOR = 2,
  DIFFUSION = 3,
  WALL = 4
}

export const BUNKKINDS = 5
export const BUNKROTKINDS = 3 // First 3 kinds have rotation
export const DIFFBUNK = 3
export const WALLBUNK = 4

// Number of rotations
export const SHIP_ROTATIONS = 32
export const BUNKER_ROTATIONS = 16

// Fuel animation frames
export const FUELFRAMES = 3

// Shard kinds
export const SHARDKINDS = 5

// Background patterns for alternating scanlines
export const BACKGROUND1 = 0xaaaaaaaa
export const BACKGROUND2 = 0x55555555

// Core sprite types
export type ShipSprite = {
  def: Uint8Array // 128 bytes (4 bytes/row × 32 rows)
  mask: Uint8Array // 128 bytes
}

export type ShipSpriteSet = {
  rotations: Record<number, ShipSprite> // 0-31 for each rotation
  getRotation(degrees: number): ShipSprite
  getRotationIndex(index: number): ShipSprite
}

export type BunkerSprite = {
  def: Uint8Array // 288 bytes (6 bytes/row × 48 rows)
  mask: Uint8Array // 288 bytes
  images: {
    background1: Uint8Array // Pre-computed with 0xAAAAAAAA
    background2: Uint8Array // Pre-computed with 0x55555555
  }
}

export type BunkerSpriteSet = {
  kinds: {
    [BunkerKind.GROUND]: Record<number, BunkerSprite> // 16 rotations
    [BunkerKind.FOLLOW]: Record<number, BunkerSprite> // 16 rotations
    [BunkerKind.GENERATOR]: Record<number, BunkerSprite> // 16 rotations
    [BunkerKind.DIFFUSION]: BunkerSprite[] // 3 variations, no rotation
    [BunkerKind.WALL]: BunkerSprite // 1 static image
  }
  getSprite(
    kind: BunkerKind,
    rotation: number,
    variation?: number
  ): BunkerSprite
}

export type FuelSprite = {
  def: Uint8Array // 128 bytes (4 bytes/row × 32 rows)
  mask: Uint8Array // 128 bytes
  images: {
    background1: Uint8Array
    background2: Uint8Array
  }
}

export type FuelSpriteSet = {
  frames: FuelSprite[] // Animation frames
  emptyCell: FuelSprite // The empty fuel cell sprite
  getFrame(index: number): FuelSprite
}

export type ShardSprite = {
  def: Uint8Array // 32 bytes (2 bytes/row × 16 rows)
  mask: Uint8Array // 32 bytes
  images: {
    background1: Uint8Array
    background2: Uint8Array
  }
}

export type ShardSpriteSet = {
  kinds: Record<number, Record<number, ShardSprite>> // [kind][rotation]
  getSprite(kind: number, rotation: number): ShardSprite
}

export type CraterSprite = {
  def: Uint8Array // 128 bytes (4 bytes/row × 32 rows)
  mask: Uint8Array // 128 bytes
  images: {
    background1: Uint8Array
    background2: Uint8Array
  }
}

export type ShieldSprite = {
  def: Uint8Array // 88 bytes (4 bytes/row × 22 rows)
}

export type AllSprites = {
  ships: ShipSpriteSet
  bunkers: BunkerSpriteSet
  fuels: FuelSpriteSet
  shards: ShardSpriteSet
  crater: CraterSprite
  shield: ShieldSprite
}

// Resource layout constants
export const FUEL_TOP = 8 * 48 // 384 pixels from top
export const SHIP_TOP = FUEL_TOP + 2 * 48 // 480 pixels from top
export const SHARD_TOP = SHIP_TOP + 32 // 512 pixels from top
export const CRATER_TOP = SHARD_TOP // Same as shard
export const CRATER_LEFT = 4 * 48 // 192 pixels from left

// Helper to create empty sprites
export function createShipSprite(): ShipSprite {
  return {
    def: new Uint8Array(4 * SHIPHT),
    mask: new Uint8Array(4 * SHIPHT)
  }
}

export function createBunkerSprite(): BunkerSprite {
  return {
    def: new Uint8Array(6 * BUNKHT),
    mask: new Uint8Array(6 * BUNKHT),
    images: {
      background1: new Uint8Array(6 * BUNKHT),
      background2: new Uint8Array(6 * BUNKHT)
    }
  }
}

export function createFuelSprite(): FuelSprite {
  return {
    def: new Uint8Array(4 * FUELHT),
    mask: new Uint8Array(4 * FUELHT),
    images: {
      background1: new Uint8Array(4 * FUELHT),
      background2: new Uint8Array(4 * FUELHT)
    }
  }
}

export function createShardSprite(): ShardSprite {
  return {
    def: new Uint8Array(2 * SHARDHT),
    mask: new Uint8Array(2 * SHARDHT),
    images: {
      background1: new Uint8Array(2 * SHARDHT),
      background2: new Uint8Array(2 * SHARDHT)
    }
  }
}

export function createCraterSprite(): CraterSprite {
  return {
    def: new Uint8Array(4 * CRATERHT),
    mask: new Uint8Array(4 * CRATERHT),
    images: {
      background1: new Uint8Array(4 * CRATERHT),
      background2: new Uint8Array(4 * CRATERHT)
    }
  }
}

export function createShieldSprite(): ShieldSprite {
  return {
    def: new Uint8Array(4 * SHIPHT)
  }
}
