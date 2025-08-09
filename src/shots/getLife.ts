import type { ShotRec } from './types'
import type { LineRec } from '@/shared/types/line'
import { LINE_KIND } from '@/shared/types/line'
import { getstrafedir } from './getstrafedir'

/**
 * Result of collision calculation
 */
export type GetLifeResult = {
  /** Frames until the shot hits a wall */
  framesToImpact: number
  /** Rotation for strafe effect (-1 if none) */
  strafedir: number
  /** Remaining lifetime after bounce (0 if not a bounce wall) */
  btime: number
  /** ID of the wall that will be hit */
  hitlineId: string
}

/**
 * Calculate when and how a shot will hit a wall
 *
 * Based on get_life() logic from orig/Sources/Terrain.c:114-230
 *
 * This function calculates:
 * - How many frames until the shot hits a wall
 * - Which wall will be hit first
 * - The strafe effect direction
 * - Whether it's a bounce (and remaining lifetime)
 *
 * @param shot - The shot to calculate trajectory for
 * @param walls - All walls to check for collision
 * @param totallife - Total remaining lifetime of the shot
 * @returns Collision calculation results
 */
export function getLife(
  shot: ShotRec,
  walls: LineRec[],
  totallife: number
): GetLifeResult {
  // Default result - no collision
  let result: GetLifeResult = {
    framesToImpact: totallife,
    strafedir: -1,
    btime: 0,
    hitlineId: ''
  }

  // This is a simplified placeholder
  // Full implementation would:

  // 1. For each wall, calculate if the shot's trajectory intersects it
  // 2. If it intersects, calculate how many frames until impact
  // 3. Track the wall with the shortest time to impact
  // 4. For the nearest wall:
  //    - Calculate strafedir using getstrafedir(wall, shot.h, shot.v)
  //    - If it's a bounce wall (LINE_KIND.BOUNCE), set btime
  //    - Store the wall's ID

  // Simplified example (would need actual trajectory math):
  let shortestTime = totallife
  let nearestWall: LineRec | null = null

  for (const wall of walls) {
    // TODO: Calculate actual intersection and time to impact
    // This would involve:
    // - Line-line intersection between shot trajectory and wall
    // - Distance calculation to determine frames

    // Placeholder: just check if we have walls
    if (walls.length > 0 && !nearestWall) {
      nearestWall = wall
      shortestTime = Math.floor(totallife / 2) // Placeholder
    }
  }

  if (nearestWall) {
    result.framesToImpact = shortestTime
    result.hitlineId = nearestWall.id

    // Calculate strafe direction based on approach angle
    result.strafedir = getstrafedir(nearestWall, shot.h, shot.v)

    // If it's a bounce wall, preserve remaining lifetime
    if (nearestWall.kind === LINE_KIND.BOUNCE && shortestTime < totallife) {
      result.btime = totallife - shortestTime
    }
  }

  return result
}
