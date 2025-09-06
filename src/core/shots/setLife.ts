import type { ShotRec } from './types'
import type { LineRec } from '@core/shared'
import { getLife } from './getLife'

/**
 * Set shot's collision parameters based on wall calculations
 *
 * Based on set_life() from orig/Sources/Terrain.c:114-230
 *
 * This function:
 * 1. Calls getLife() to calculate collision timing
 * 2. Updates the shot with the calculated values
 * 3. Returns the updated shot
 *
 * In the original C code, set_life() is called from exactly 3 places:
 *
 * 1. **ship_control()** (Play.c:542) - When firing a new ship shot
 *    Called immediately after creating a new shot with initial velocity
 *    Pass NULL for ignoreline since it's a new shot
 *
 * 2. **bounce_shot()** (Play.c:944) - After calculating bounce physics
 *    Called with sp->hitline to ignore the wall just bounced off
 *    Recalculates trajectory for the remaining lifetime
 *
 * 3. **bunk_shoot()** (Bunkers.c:180) - When bunker fires a shot
 *    Called after creating a new bunker shot
 *    Pass NULL for ignoreline since it's a new shot
 *
 * @param shot - The shot to update
 * @param walls - All walls to check for collision
 * @param totallife - Total remaining lifetime of the shot
 * @param ignoreWallId - Optional ID of wall to ignore (e.g., the wall just bounced off)
 * @param worldwidth - Width of the world in pixels
 * @param worldwrap - Whether the world wraps around at boundaries
 * @returns Updated shot with collision parameters set
 */
export function setLife(
  shot: ShotRec,
  walls: readonly LineRec[],
  totallife: number,
  ignoreWallId: string | undefined,
  worldwidth: number,
  worldwrap: boolean
): ShotRec {
  // Filter out the wall to ignore if specified
  const wallsToCheck = ignoreWallId
    ? walls.filter(w => w.id !== ignoreWallId)
    : walls

  const world8 = worldwidth << 3

  // Calculate collision timing and parameters
  let result = getLife(shot, wallsToCheck, totallife)

  // Compute endpoint of shot (matches original line 126)
  const x2 = (shot.x8 + result.framesToImpact * shot.h) >> 3

  // World wrap logic (matches original lines 127-137)
  if (worldwrap) {
    if (x2 < 0) {
      // Temporarily adjust shot position, recalculate, then use original position
      const adjustedShot = { ...shot, x8: shot.x8 + world8 }
      result = getLife(adjustedShot, wallsToCheck, totallife)
    } else if (x2 > worldwidth) {
      // Temporarily adjust shot position, recalculate, then use original position
      const adjustedShot = { ...shot, x8: shot.x8 - world8 }
      result = getLife(adjustedShot, wallsToCheck, totallife)
    }
  }

  // Return updated shot with calculated values
  // CRITICAL: Synchronize pixel coordinates from sub-pixel coordinates
  // The original get_life() (Terrain.c:154-155) updates sp->x and sp->y
  // This must happen to avoid using stale coordinates in collision checks
  return {
    ...shot,
    x: shot.x8 >> 3, // Sync pixel coordinate from sub-pixel
    y: shot.y8 >> 3, // Sync pixel coordinate from sub-pixel
    lifecount: result.framesToImpact,
    strafedir: result.strafedir,
    btime: result.btime,
    hitlineId: result.hitlineId
  }
}
