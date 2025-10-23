/**
 * @fileoverview Node.js-compatible minimal sprite service for headless validation
 *
 * This version only provides bunker sprites (masks) needed for collision detection.
 * Used by the recording validator in CLI tools.
 */

import { extractAllSprites, BunkerKind } from '@core/figs'
import type {
  SpriteData,
  SpriteService,
  FullOptions,
  ShipOptions
} from './service'
import { precomputeFormats } from './service'
import { readFileSync } from 'fs'

/**
 * Creates a minimal sprite service for Node.js headless environments
 * Only supports ship and bunker masks for collision detection
 */
export function createSpriteServiceNode(spritePath: string): SpriteService {
  // Load sprite resource file from file system
  const buffer = readFileSync(spritePath)
  const arrayBuffer = buffer.buffer.slice(
    buffer.byteOffset,
    buffer.byteOffset + buffer.byteLength
  )

  const allSprites = extractAllSprites(arrayBuffer)

  // Pre-compute ship masks (needed for collision detection)
  const shipMasks = new Map<string, SpriteData>()
  for (let rotation = 0; rotation < 32; rotation++) {
    const sprite = allSprites.ships.getRotationIndex(rotation)
    shipMasks.set(`${rotation}-mask`, precomputeFormats(sprite.mask, 32, 32))
  }

  // Pre-compute bunker masks (needed for collision detection)
  const bunkerMasks = new Map<string, SpriteData>()

  for (const [, kindValue] of Object.entries(BunkerKind)) {
    if (typeof kindValue !== 'number') continue
    const kind = kindValue as BunkerKind

    if (kind === BunkerKind.WALL || kind === BunkerKind.DIFF) {
      // Rotating bunkers: 16 rotations
      for (let rotation = 0; rotation < 16; rotation++) {
        const sprite = allSprites.bunkers.getSprite(kind, rotation)
        bunkerMasks.set(
          `${kind}-${rotation}-mask`,
          precomputeFormats(sprite.mask, 48, 48)
        )
      }
    } else {
      // Animated bunkers: 8 frames
      for (let frame = 0; frame < 8; frame++) {
        const sprite = allSprites.bunkers.getSprite(kind, frame)
        bunkerMasks.set(
          `${kind}-${frame}-mask`,
          precomputeFormats(sprite.mask, 48, 48)
        )
      }
    }
  }

  // Return a minimal service that only supports ship and bunker masks
  return {
    getShipSprite(rotation: number, options: ShipOptions): SpriteData {
      if (options.variant !== 'mask') {
        throw new Error(
          'Headless sprite service only supports ship mask variant'
        )
      }

      const key = `${rotation}-mask`
      const data = shipMasks.get(key)
      if (!data) {
        throw new Error(
          `Ship sprite not found: rotation=${rotation}, variant=mask`
        )
      }
      return data
    },

    getBunkerSprite(
      kind: BunkerKind,
      rotationOrFrame: number,
      options: FullOptions
    ): SpriteData {
      if (options.variant !== 'mask') {
        throw new Error(
          'Headless sprite service only supports bunker mask variant'
        )
      }

      const key = `${kind}-${rotationOrFrame}-mask`
      const data = bunkerMasks.get(key)
      if (!data) {
        throw new Error(
          `Bunker sprite not found: kind=${kind}, rotation=${rotationOrFrame}, variant=mask`
        )
      }
      return data
    },

    // All other methods throw - not needed for headless validation
    getFuelSprite(): SpriteData {
      throw new Error('Headless sprite service does not support fuel sprites')
    },
    getShardSprite(): SpriteData {
      throw new Error('Headless sprite service does not support shard sprites')
    },
    getCraterSprite(): SpriteData {
      throw new Error('Headless sprite service does not support crater sprites')
    },
    getShieldSprite(): SpriteData {
      throw new Error('Headless sprite service does not support shield sprites')
    },
    getFlameSprite(): SpriteData {
      throw new Error('Headless sprite service does not support flame sprites')
    },
    getStrafeSprite(): SpriteData {
      throw new Error('Headless sprite service does not support strafe sprites')
    },
    getDigitSprite() {
      throw new Error('Headless sprite service does not support digit sprites')
    },
    getStatusBarTemplate() {
      throw new Error(
        'Headless sprite service does not support status bar template'
      )
    },
    getTitlePage() {
      throw new Error('Headless sprite service does not support title page')
    }
  }
}
