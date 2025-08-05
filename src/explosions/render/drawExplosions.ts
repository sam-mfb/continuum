import type { MonochromeBitmap } from '@/bitmap'
import { cloneBitmap } from '@/bitmap'
import { SCRWTH, VIEWHT } from '@/screen/constants'
import type { ExplosionsState } from '../types'
import { SHARDHT, NUMSHARDS, NUMSPARKS } from '../constants'
import { drawShard } from './drawShard'
import { drawSparkSafe } from './drawSparkSafe'

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
 * @param deps.shardImages - Shard sprite data indexed by [kind][rotation][frame]
 * @returns Transform function that draws all explosions on a bitmap
 */
export function drawExplosions(deps: {
  explosions: ExplosionsState
  screenx: number
  screeny: number
  worldwidth: number
  worldwrap: boolean
  shardImages: Uint16Array[][][]
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
            const rotation = (shard.x + shard.y) & 1
            const frame = shard.rot16 >> 4
            const sprite = shardImages[shard.kind]?.[rotation]?.[frame]

            if (sprite) {
              result = drawShard({
                x: shard.x - screenx,
                y: shard.y - screeny,
                def: sprite,
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
            const rotation = (shard.x + shard.y) & 1
            const frame = shard.rot16 >> 4
            const sprite = shardImages[shard.kind]?.[rotation]?.[frame]

            if (sprite) {
              result = drawShard({
                x: shard.x - screenx + worldwidth,
                y: shard.y - screeny,
                def: sprite,
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
