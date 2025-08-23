import { extractAllSprites } from '@/figs'
import type { BunkerKind } from '@/figs/types'
import type {
  SpriteService,
  ShipSprite,
  BunkerSprite,
  FuelSprite,
  ShardSprite,
  CraterSprite,
  ShieldSprite,
  FlameSprite
} from './types'

/**
 * Creates a sprite service by loading all sprite data
 * This is an async factory function that loads sprites from the resource file
 * and hardcoded data, then returns a service for accessing individual sprites
 */
export async function createSpriteService(): Promise<SpriteService> {
  // Load sprite resource file
  const response = await fetch('/src/assets/graphics/rsrc_260.bin')
  if (!response.ok) {
    throw new Error('Failed to load sprite resource')
  }

  const arrayBuffer = await response.arrayBuffer()
  const allSprites = extractAllSprites(arrayBuffer)

  // Return the service implementation
  return {
    getShipSprite(rotationIndex: number): ShipSprite {
      return allSprites.ships.getRotationIndex(rotationIndex)
    },

    getBunkerSprite(kind: BunkerKind, rotationOrFrame: number): BunkerSprite {
      return allSprites.bunkers.getSprite(kind, rotationOrFrame)
    },

    getFuelSprite(frame: number): FuelSprite {
      if (frame === 8) {
        // Special case for empty fuel cell
        return allSprites.fuels.emptyCell
      }
      return allSprites.fuels.getFrame(frame)
    },

    getShardSprite(kind: number, rotation: number): ShardSprite {
      return allSprites.shards.getSprite(kind, rotation)
    },

    getCraterSprite(): CraterSprite {
      return allSprites.crater
    },

    getShieldSprite(): ShieldSprite {
      return allSprites.shield
    },

    getFlameSprite(frame: number): FlameSprite {
      return allSprites.flames.getFrame(frame)
    },

    getStrafeSprite(rotation: number): Uint8Array {
      return allSprites.strafe.getFrame(rotation)
    },

    getDigitSprite(char: string): Uint8Array | null {
      return allSprites.digits.getCharacter(char)
    }
  }
}
