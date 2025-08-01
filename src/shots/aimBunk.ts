import type { Bunker } from '@/planet/types'
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

  // The sprite frames are oriented differently than the angle system:
  // - Angle 0° = East, but Frame 0 = North
  // - So we need to rotate by -90° (or +270°) to convert angle to frame
  angle += 270
  if (angle >= 360) {
    angle -= 360
  }

  angle += 11
  if (angle >= 360) {
    angle -= 360
  }
  angle = (angle << 1) / 45 /* / 22.5 => 0-15 */
  if (angle >= 8) {
    angle -= 8 /* 0-7 */
  }
  angle = Math.floor(angle)

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
