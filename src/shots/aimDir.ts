import type { Bunker } from '@/planet/types'
import { ptToAngle } from '@/shared/ptToAngle'

/**
 * Calculate angle from bunker to ship
 * See orig/Sources/Bunkers.c at aim_dir():77-94
 */
export function aimDir(
  bp: Bunker,
  deps: {
    globalx: number
    globaly: number
    worldwidth: number
    worldwrap: boolean
  }
): number {
  const { globalx, globaly, worldwidth, worldwrap } = deps

  // Calculate delta to ship
  let delV = globaly - bp.y
  let delH = globalx - bp.x

  // Handle world wrap to find shortest path
  if (worldwrap) {
    if (delH > worldwidth >> 1) {
      delH -= worldwidth
    } else if (delH < -(worldwidth >> 1)) {
      delH += worldwidth
    }
  }

  // Calculate the target position after wrapping
  const targetX = bp.x + delH
  const targetY = bp.y + delV

  // Use PtToAngle to get the angle
  return ptToAngle(bp.x, bp.y, targetX, targetY)
}
