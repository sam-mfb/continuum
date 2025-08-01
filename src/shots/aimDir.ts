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

  // PtToAngle equivalent - Mac's PtToAngle measures angles clockwise from right (0°)
  // In Mac coordinates:
  // - 0° = East (right)
  // - 90° = South (down) 
  // - 180° = West (left)
  // - 270° = North (up)
  // Math.atan2 measures counter-clockwise from right, so we need to convert
  
  // Mac's coordinate system has Y increasing downward and angles measured clockwise from East
  // - delH = target.x - bunker.x (positive when target is to the right)
  // - delV = target.y - bunker.y (positive when target is below in screen coords)
  // Math.atan2(y, x) gives counter-clockwise angle from positive X axis
  // To get clockwise from East in screen coordinates, we use Math.atan2(delV, delH)
  let angle = Math.atan2(delV, delH)
  
  // Convert from radians to degrees
  angle = (angle * 180) / Math.PI
  
  // Convert to 0-359 range (Math.atan2 returns -180 to 180)
  if (angle < 0) angle += 360

  return Math.floor(angle)
}
