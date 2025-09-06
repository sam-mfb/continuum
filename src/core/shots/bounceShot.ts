/**
 * Shot bouncing physics implementation
 * Based on orig/Sources/Play.c bounce_shot() (lines 926-948) and backup_shot() (lines 877-885)
 */

import type { ShotRec } from './types'
import type { LineRec } from '@core/shared/types/line'
import { BOUNCE_VECS } from './constants'
import { setLife } from './setLife'
import { idiv } from './integerMath'

/**
 * Backs up a shot position to prevent wall clipping after bounce
 * Based on orig/Sources/Play.c backup_shot() (lines 877-885)
 *
 * When shots bounce, they need to be backed up slightly so they don't
 * immediately hit the opposite side of the bounce wall.
 *
 * @param shot - The shot to back up
 * @returns A new shot with backed up position
 */
function backupShot(shot: ShotRec): ShotRec {
  const backedUp = { ...shot }

  // Back up by 1/3 of velocity using integer division (not floor)
  // C integer division truncates toward zero, Math.floor rounds down
  backedUp.x8 -= idiv(backedUp.h, 3)
  backedUp.y8 -= idiv(backedUp.v, 3)

  // Update pixel position from subpixel position
  backedUp.x = backedUp.x8 >> 3
  backedUp.y = backedUp.y8 >> 3

  return backedUp
}

/**
 * Apply bounce physics to a shot hitting a wall
 * Based on orig/Sources/Play.c bounce_shot() (lines 926-948)
 *
 * Theory from original code:
 * v1 gets [v1 - 2(v1.v2)v2]
 * v2 is unit vector that points outward from the bouncing wall.
 *
 * The wall normal is determined by the strafedir which was pre-calculated
 * when the shot's trajectory was analyzed.
 *
 * @param shot - The shot to bounce
 * @param wall - The wall being bounced off
 * @param walls - All walls for trajectory calculation
 * @param worldwidth - World width for wrapping
 * @param worldwrap - Whether world wraps
 * @returns A new shot with reflected velocity and updated trajectory
 */
export function bounceShot(
  shot: ShotRec,
  wall: LineRec,
  walls: readonly LineRec[],
  worldwidth: number,
  worldwrap: boolean
): ShotRec {
  // First back up the shot to prevent wall sticking
  let bouncedShot = backupShot(shot)

  // Maximum 8 iterations to prevent infinite loops (from original)
  for (
    let i = 0;
    i < 8 && bouncedShot.lifecount === 0 && bouncedShot.btime > 0;
    i++
  ) {
    // Get wall normal vector components from the pre-calculated strafe direction
    // strafedir indicates the angle of the wall that was hit
    const x1 = BOUNCE_VECS[bouncedShot.strafedir]!
    // y component is 90 degrees rotated (12 positions in 16-direction system)
    const y1 = BOUNCE_VECS[(bouncedShot.strafedir + 12) & 15]!

    // Calculate dot product of velocity with wall normal
    const dot = bouncedShot.h * x1 + bouncedShot.v * y1

    // Reflect velocity: v = v - 2(v·n)n
    // The division by (24*48) normalizes since BOUNCE_VECS aren't unit vectors
    // Use integer division to match C behavior
    bouncedShot.h -= idiv(x1 * dot, 24 * 48)
    bouncedShot.v -= idiv(y1 * dot, 24 * 48)

    // Restore lifetime for continued flight
    bouncedShot.lifecount = bouncedShot.btime
    bouncedShot.btime = 0

    // Clear the hit line reference since we've bounced off it
    bouncedShot.hitlineId = ''

    // Call set_life() to find the next collision (Play.c:944)
    // Pass the wall we just bounced off to ignore it in collision detection
    bouncedShot = setLife(
      bouncedShot,
      walls,
      bouncedShot.lifecount,
      wall.id,
      worldwidth,
      worldwrap
    )
  }

  // If we couldn't bounce successfully (lifecount still 0), no strafe effect
  if (bouncedShot.lifecount === 0) {
    bouncedShot.strafedir = -1
  }

  return bouncedShot
}
