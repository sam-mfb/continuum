import type { ShotRec } from './types'
import type { LineRec } from '@/shared/types/line'
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
 * @returns Updated shot with collision parameters set
 */
export function setLife(
  shot: ShotRec,
  walls: LineRec[],
  totallife: number,
  ignoreWallId?: string
): ShotRec {
  // Filter out the wall to ignore if specified
  const wallsToCheck = ignoreWallId
    ? walls.filter(w => w.id !== ignoreWallId)
    : walls

  // Calculate collision timing and parameters
  const result = getLife(shot, wallsToCheck, totallife)

  // Return updated shot with calculated values
  return {
    ...shot,
    lifecount: result.framesToImpact,
    strafedir: result.strafedir,
    btime: result.btime,
    hitlineId: result.hitlineId
  }
}
