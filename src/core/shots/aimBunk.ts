import type { Bunker } from '@core/planet'
import { aimDir } from './aimDir'

/**
 * Calculate rotation direction for following bunker
 * See orig/Sources/Bunkers.c at aim_bunk():53-74
 */
export function aimBunk(
  bunk: Bunker,
  deps: {
    globalx: number
    globaly: number
    worldwidth: number
    worldwrap: boolean
  }
): number {
  let angle = aimDir(bunk, deps) /* 0-359 */

  angle += 11
  if (angle >= 360) {
    angle -= 360
  }
  angle = Math.floor((angle << 1) / 45) /* / 22.5 => 0-15 */
  if (angle >= 8) {
    angle -= 8 /* 0-7 */
  }

  let diff = angle - bunk.rot
  if (diff < 0) {
    diff += 8
  }

  if (diff === 0) {
    return 0
  } else {
    return diff < 4 ? 1 : -1
  }
}
