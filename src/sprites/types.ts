import type { BunkerKind } from '@/figs/types'

export type ShipSprite = {
  def: Uint8Array
  mask: Uint8Array
}

export type BunkerSprite = {
  def: Uint8Array
  mask: Uint8Array
  images: {
    background1: Uint8Array
    background2: Uint8Array
  }
}

export type FuelSprite = {
  def: Uint8Array
  mask: Uint8Array
  images: {
    background1: Uint8Array
    background2: Uint8Array
  }
}

export type ShardSprite = {
  def: Uint8Array
  mask: Uint8Array
  images: {
    background1: Uint8Array
    background2: Uint8Array
  }
}

export type CraterSprite = {
  def: Uint8Array
  mask: Uint8Array
  images: {
    background1: Uint8Array
    background2: Uint8Array
  }
}

export type ShieldSprite = {
  def: Uint8Array
}

export type FlameSprite = {
  def: Uint8Array
  width: number
  height: number
}

export type SpriteService = {
  /**
   * Get ship sprite for a given rotation
   * @param rotationIndex 0-31 for 32 possible rotations
   */
  getShipSprite(rotationIndex: number): ShipSprite

  /**
   * Get bunker sprite
   * @param kind Bunker type (WALL, DIFF, GROUND, FOLLOW, GENERATOR)
   * @param rotationOrFrame Rotation (0-15) for WALL/DIFF, animation frame (0-7) for others
   */
  getBunkerSprite(kind: BunkerKind, rotationOrFrame: number): BunkerSprite

  /**
   * Get fuel sprite for a given animation frame
   * @param frame 0-7 for animation, 8 for empty cell
   */
  getFuelSprite(frame: number): FuelSprite

  /**
   * Get shard sprite
   * @param kind 0-6 for different shard types
   * @param rotation 0-15 for rotation angle
   */
  getShardSprite(kind: number, rotation: number): ShardSprite

  /**
   * Get the crater sprite
   */
  getCraterSprite(): CraterSprite

  /**
   * Get the shield sprite
   */
  getShieldSprite(): ShieldSprite

  /**
   * Get flame sprite for a given animation frame
   * @param frame Animation frame index
   */
  getFlameSprite(frame: number): FlameSprite

  /**
   * Get strafe sprite for a given rotation
   * @param rotation 0-15 for strafe impact rotation
   */
  getStrafeSprite(rotation: number): Uint8Array

  /**
   * Get digit sprite for a character
   * @param char '0'-'9' or ' ' (space)
   */
  getDigitSprite(char: string): Uint8Array | null
}
