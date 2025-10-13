import { SBARHT, SCRWTH, VIEWHT } from '@/core/screen'
import { SHARDHT } from '@/core/explosions'
import { cloneFrame, type Frame } from '@/lib/frame'
import { Z } from './z'
import type { ShardRec } from '@/core/explosions'

// Spark type from ExplosionsState
type SparkRec = {
  x: number
  y: number
  v: number
  h: number
  lifecount: number
}

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

    // Calculate screen bounds with margins for partial rendering
    // Allow shards to be up to SHARDHT pixels off-screen (like bunkers use 48px margin)
    const rightShard = screenX + SCRWTH + SHARDHT
    const botShard = screenY + VIEWHT + SHARDHT
    const leftShard = screenX - SHARDHT
    const topShard = screenY - SHARDHT

    // Draw each shard (Terrain.c:456-478)
    for (let i = 0; i < shards.length; i++) {
      const shard = shards[i]!

      // Skip inactive shards
      if (shard.lifecount <= 0) continue

      // Check vertical bounds - allow partial rendering
      if (shard.y <= topShard || shard.y >= botShard) continue

      // Check horizontal bounds and draw
      if (shard.x > leftShard && shard.x < rightShard) {
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
        shard.x > leftShard - worldwidth &&
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

/**
 * Draw explosion sparks (2x2 white dots) using frame-based rendering
 * Based on spark rendering from draw_explosions() in orig/Sources/Terrain.c:482-502
 * and draw_spark_safe() in orig/Sources/Draw.c:600-614
 */
export function drawSparks(deps: {
  readonly sparks: readonly SparkRec[]
  readonly sparksalive: number
  readonly totalsparks: number
  screenX: number
  screenY: number
  worldwidth: number
  worldwrap: boolean
}): (frame: Frame) => Frame {
  const {
    sparks,
    sparksalive,
    totalsparks,
    screenX,
    screenY,
    worldwidth,
    worldwrap
  } = deps

  return oldFrame => {
    // Early return if no sparks alive
    if (sparksalive <= 0) return oldFrame

    const newFrame = cloneFrame(oldFrame)

    // Calculate screen bounds
    const rightSpark = screenX + SCRWTH - 1
    const botSpark = screenY + VIEWHT - 1
    const onRightSide = screenX > worldwidth - SCRWTH

    // Draw each spark (Terrain.c:482-502)
    for (let i = 0; i < totalsparks && i < sparks.length; i++) {
      const spark = sparks[i]!

      // Skip inactive sparks
      if (spark.lifecount <= 0) continue

      // Check vertical bounds (Terrain.c:496)
      if (spark.y < screenY || spark.y >= botSpark) continue

      // Check horizontal bounds and draw (Terrain.c:497-498)
      if (spark.x >= screenX && spark.x < rightSpark) {
        newFrame.drawables.push({
          id: `spark-${i}`,
          type: 'rect',
          z: Z.SPARK,
          alpha: 1,
          topLeft: {
            x: spark.x - screenX,
            y: spark.y - screenY + SBARHT
          },
          width: 2,
          height: 2,
          fillColor: 'white'
        })
      }
      // Draw wrapped spark if needed (Terrain.c:499-501)
      else if (worldwrap && onRightSide && spark.x < rightSpark - worldwidth) {
        newFrame.drawables.push({
          id: `spark-${i}-wrap`,
          type: 'rect',
          z: Z.SPARK,
          alpha: 1,
          topLeft: {
            x: spark.x - screenX + worldwidth,
            y: spark.y - screenY + SBARHT
          },
          width: 2,
          height: 2,
          fillColor: 'white'
        })
      }
    }

    return newFrame
  }
}
