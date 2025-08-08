import type { MonochromeBitmap } from '@/bitmap'
import { cloneBitmap } from '@/bitmap'
import { SCRWTH, VIEWHT } from '@/screen/constants'
import type { ExplosionsState } from '../types'
import { SHARDHT, NUMSHARDS, NUMSPARKS } from '../constants'
import { drawShard } from './drawShard'
import { drawSparkSafe } from './drawSparkSafe'
import type { ShardSpriteSet } from '@/figs/types'

/**
 * Render all active explosions (shards and sparks)
 * Based on the rendering portions of draw_explosions() in Terrain.c:447-503
 *
 * This is the pure rendering function - all physics updates are handled
 * by the updateExplosions reducer.
 *
 * @param deps - Drawing dependencies
 * @param deps.explosions - Current explosion state
 * @param deps.screenx - Screen x position in world coordinates
 * @param deps.screeny - Screen y position in world coordinates
 * @param deps.worldwidth - World width for wrapping
 * @param deps.worldwrap - Whether world wraps horizontally
 * @param deps.shardImages - Shard sprite set with sprites indexed by kind and rotation
 * @returns Transform function that draws all explosions on a bitmap
 */
export function drawExplosions(deps: {
  explosions: ExplosionsState
  screenx: number
  screeny: number
  worldwidth: number
  worldwrap: boolean
  shardImages: ShardSpriteSet | null
}): (screen: MonochromeBitmap) => MonochromeBitmap {
  return screen => {
    const { explosions, screenx, screeny, worldwidth, worldwrap, shardImages } =
      deps

    // Calculate screen bounds (Terrain.c:454-455, 480-481)
    const rightShard = screenx + SCRWTH - SHARDHT
    const botShard = screeny + VIEWHT - SHARDHT
    const rightSpark = screenx + SCRWTH - 1
    const botSpark = screeny + VIEWHT - 1

    let result = cloneBitmap(screen)

    // Draw shards (Terrain.c:456-478)
    for (let i = 0; i < NUMSHARDS; i++) {
      const shard = explosions.shards[i]!
      if (shard.lifecount > 0) {
        // Check vertical bounds (Terrain.c:467)
        if (shard.y > screeny && shard.y < botShard) {
          // Check horizontal bounds and draw (Terrain.c:468-471)
          if (shard.x > screenx && shard.x < rightShard) {
            // Phase-aware background choice: world parity XOR viewport phase
            // Matches shardTestBitmap and keeps precompute in phase with 32-bit write
            const screenSwap = (screenx + screeny) & 1
            const xScreen = shard.x - screenx
            const laneParity = ((xScreen >> 3) & 1)
            const align = ((shard.x + shard.y) & 1) ^ screenSwap ^ laneParity
            const rotation = shard.rot16 >> 4

            // Get the sprite for this shard type and rotation
            const sprite = shardImages?.getSprite(shard.kind, rotation)

            if (sprite) {
              // Use pre-rendered image based on alignment
              const imageData =
                align === 0
                  ? sprite.images.background1
                  : sprite.images.background2

              // Convert Uint8Array to Uint16Array (big-endian)
              const uint16Def = new Uint16Array(imageData.length / 2)
              for (let i = 0; i < uint16Def.length; i++) {
                uint16Def[i] = (imageData[i * 2]! << 8) | imageData[i * 2 + 1]!
              }

              result = drawShard({
                x: shard.x - screenx,
                y: shard.y - screeny,
                def: uint16Def,
                height: SHARDHT
              })(result)
            }
          }

          // Draw wrapped shard if needed (Terrain.c:472-476)
          if (
            worldwrap &&
            shard.x > screenx - worldwidth &&
            shard.x < rightShard - worldwidth
          ) {
            // For wrapped copy, compute parity at WRAPPED world X and include viewport phase
            const wrappedX = ((shard.x + worldwidth) % worldwidth + worldwidth) % worldwidth
            const screenSwap = (screenx + screeny) & 1
            const xScreenWrapped = shard.x - screenx + worldwidth
            const laneParityWrapped = ((xScreenWrapped >> 3) & 1)
            const align = ((wrappedX + shard.y) & 1) ^ screenSwap ^ laneParityWrapped
            const rotation = shard.rot16 >> 4

            // Get the sprite for this shard type and rotation
            const sprite = shardImages?.getSprite(shard.kind, rotation)

            if (sprite) {
              // Use pre-rendered image based on alignment
              const imageData =
                align === 0
                  ? sprite.images.background1
                  : sprite.images.background2

              // Convert Uint8Array to Uint16Array (big-endian)
              const uint16Def = new Uint16Array(imageData.length / 2)
              for (let i = 0; i < uint16Def.length; i++) {
                uint16Def[i] = (imageData[i * 2]! << 8) | imageData[i * 2 + 1]!
              }

              result = drawShard({
                x: shard.x - screenx + worldwidth,
                y: shard.y - screeny,
                def: uint16Def,
                height: SHARDHT
              })(result)
            }
          }
        }
      }
    }

    // Draw sparks (Terrain.c:482-502)
    if (explosions.sparksalive > 0) {
      const onRightSide = screenx > worldwidth - SCRWTH

      for (let i = 0; i < explosions.totalsparks && i < NUMSPARKS; i++) {
        const spark = explosions.sparks[i]!
        if (spark.lifecount > 0) {
          // Check vertical bounds (Terrain.c:496)
          if (spark.y >= screeny && spark.y < botSpark) {
            // Check horizontal bounds and draw (Terrain.c:497-498)
            if (spark.x >= screenx && spark.x < rightSpark) {
              result = drawSparkSafe({
                x: spark.x - screenx,
                y: spark.y - screeny
              })(result)
            }
            // Draw wrapped spark if needed (Terrain.c:499-501)
            else if (onRightSide && spark.x < rightSpark - worldwidth) {
              result = drawSparkSafe({
                x: spark.x - screenx + worldwidth,
                y: spark.y - screeny
              })(result)
            }
          }
        }
      }
    }

    return result
  }
}
