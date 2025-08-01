import type { Bunker } from '@/planet/types'

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

  // PtToAngle equivalent - calculate angle in degrees
  let angle = (Math.atan2(delV, delH) * 180) / Math.PI

  // Convert from math angle (-180 to 180) to game angle (0-359)
  angle = (90 - angle + 360) % 360

  return Math.floor(angle)
}
