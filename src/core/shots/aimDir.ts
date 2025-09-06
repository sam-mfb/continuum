import type { Bunker } from '@core/planet'
import { ptToAngle } from '@core/shared'

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

  // The original uses PtToAngle with a Rect centered at origin (-10,-10,10,10)
  // and passes the delta vector as the point
  // This calculates angle from (0,0) to (delH, delV)
  return ptToAngle(0, 0, delH, delV)
}
