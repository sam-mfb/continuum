import { SBARHT, SCRWTH, VIEWHT } from '@/core/screen'
import { SHARDHT } from '@/core/explosions'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'
import type { ShardRec } from '@/core/explosions'

/**
 * Frame-based rendering for explosion shards
 * Based on shard rendering from draw_explosions() in orig/Sources/Terrain.c:456-478
 *
 * IMPORTANT SPRITE MAPPING:
 * - 7 shard types (kinds 0-6): Different debris shapes based on bunker type
 * - 4 base sprites per type (shard-{kind}-00 through 03)
 * - 16 total rotations achieved by combining base sprites with canvas rotation
 * - rot16 >> 4 gives rotation value 0-15
 */
export function drawShards(deps: {
  readonly shards: readonly ShardRec[]
  screenX: number
  screenY: number
  worldwidth: number
  worldwrap: boolean
}): (frame: Frame) => Frame {
  const { shards, screenX, screenY, worldwidth, worldwrap } = deps

  return oldFrame => {
    const newFrame = cloneFrame(oldFrame)

    // Calculate screen bounds (Terrain.c:454-455)
    const rightShard = screenX + SCRWTH - SHARDHT
    const botShard = screenY + VIEWHT - SHARDHT

    // Draw each shard (Terrain.c:456-478)
    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i]!

      // Skip inactive shards
      if (shard.lifecount <= 0) continue

      // Check vertical bounds (Terrain.c:467)
      // Must match bitmap renderer: shard.y > screeny && shard.y < botShard
      if (!(shard.y > screenY && shard.y < botShard)) continue

      // Check horizontal bounds and draw (Terrain.c:468-471)
      if (shard.x > screenX && shard.x < rightShard) {
        // Calculate rotation from rot16 (stored as 0-255, >> 4 gives 0-15)
        const rotation16 = shard.rot16 >> 4 // 0-15

        // Map to base sprite (0-3) and canvas rotation
        const baseRotation = rotation16 % 4
        const rotationQuadrants = Math.floor(rotation16 / 4)

        // Each quadrant is 90 degrees (π/2 radians)
        const spriteRotation = rotationQuadrants * (Math.PI / 2)

        // Build sprite ID: shard-{kind}-{rotation}
        const rotStr =
          baseRotation < 10 ? `0${baseRotation}` : `${baseRotation}`
        const spriteId = `shard-${shard.kind}-${rotStr}`

        newFrame.drawables.push({
          id: `shard-${i}`,
          type: 'sprite',
          spriteId: spriteId,
          z: Z.SHARD,
          alpha: 1,
          topLeft: {
            x: shard.x - screenX,
            y: shard.y - screenY + SBARHT
          },
          rotation: spriteRotation
        })
      }

      // Draw wrapped shard if needed (Terrain.c:472-476)
      if (
        worldwrap &&
        shard.x > screenX - worldwidth &&
        shard.x < rightShard - worldwidth
      ) {
        // Calculate rotation from rot16
        const rotation16 = shard.rot16 >> 4 // 0-15

        // Map to base sprite (0-3) and canvas rotation
        const baseRotation = rotation16 % 4
        const rotationQuadrants = Math.floor(rotation16 / 4)

        // Each quadrant is 90 degrees (π/2 radians)
        const spriteRotation = rotationQuadrants * (Math.PI / 2)

        // Build sprite ID: shard-{kind}-{rotation}
        const rotStr =
          baseRotation < 10 ? `0${baseRotation}` : `${baseRotation}`
        const spriteId = `shard-${shard.kind}-${rotStr}`

        newFrame.drawables.push({
          id: `shard-${i}-wrap`,
          type: 'sprite',
          spriteId: spriteId,
          z: Z.SHARD,
          alpha: 1,
          topLeft: {
            x: shard.x - screenX + worldwidth,
            y: shard.y - screenY + SBARHT
          },
          rotation: spriteRotation
        })
      }
    }

    return newFrame
  }
}
