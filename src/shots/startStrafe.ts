import { NUMSTRAFES, STRAFE_LIFE } from './constants'
import type { StrafeRec } from './types'

/**
 * Start a strafe animation at the given position
 * From orig/Sources/Terrain.c at start_strafe():379-394
 *
 * Strafes are visual effects that appear when shots hit terrain or expire.
 * The system maintains a pool of NUMSTRAFES (5) strafe records and reuses
 * the oldest one when a new strafe is needed.
 *
 * @param x - World x coordinate for the strafe
 * @param y - World y coordinate for the strafe
 * @param dir - Direction/rotation for the strafe (0-15), or -1 for no strafe
 */
export function startStrafe(
  x: number,
  y: number,
  dir: number
): (strafes: StrafeRec[]) => StrafeRec[] {
  return strafes => {
    // if (dir < 0) return; /* no strafe on that one */ (Terrain.c:384)
    if (dir < 0) return strafes

    // Find the strafe with the lowest lifecount (oldest/unused)
    // str=strafes; (Terrain.c:386)
    // for(p = strafes; p < strafes+NUMSTRAFES && str->lifecount; p++)
    //   if (p->lifecount < str->lifecount)
    //     str = p; (Terrain.c:387-389)
    let oldestStrafeIndex = 0
    let lowestLifecount = strafes[0]!.lifecount

    for (let i = 0; i < NUMSTRAFES && lowestLifecount > 0; i++) {
      const strafe = strafes[i]!
      if (strafe.lifecount < lowestLifecount) {
        oldestStrafeIndex = i
        lowestLifecount = strafe.lifecount
      }
    }

    // Create new array with updated strafe
    // str->x = x; (Terrain.c:390)
    // str->y = y; (Terrain.c:391)
    // str->lifecount = STRAFE_LIFE; (Terrain.c:392)
    // str->rot = dir; (Terrain.c:393)
    return strafes.map((strafe, index) =>
      index === oldestStrafeIndex
        ? { x, y, lifecount: STRAFE_LIFE, rot: dir }
        : strafe
    )
  }
}
