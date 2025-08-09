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
 * In the original C code, this is called from:
 * - ship_control() when firing a new shot
 * - bounce_shot() after a bounce
 * - Various other places when trajectory changes
 *
 * @param shot - The shot to update
 * @param walls - All walls to check for collision
 * @param totallife - Total remaining lifetime of the shot
 * @returns Updated shot with collision parameters set
 */
export function setLife(
  shot: ShotRec,
  walls: LineRec[],
  totallife: number
): ShotRec {
  // Calculate collision timing and parameters
  const result = getLife(shot, walls, totallife)

  // Return updated shot with calculated values
  return {
    ...shot,
    lifecount: result.framesToImpact,
    strafedir: result.strafedir,
    btime: result.btime,
    hitlineId: result.hitlineId
  }
}
