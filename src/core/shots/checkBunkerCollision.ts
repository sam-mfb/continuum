import type { ShotRec } from './types'
import type { Bunker } from '@core/planet/types'
import { legalAngle } from '@core/planet/legalAngle'
import { xyindistance } from './xyindistance'
import { BUNKROTKINDS } from '@core/figs'
import { BRADIUS } from './constants'

/**
 * Check if a shot collides with any bunker
 * Based on Play.c:763-784
 *
 * The original C code uses pointer arithmetic to iterate through bunkers.
 * We use array indexing to achieve the same effect.
 *
 * @param shot - The shot to check for collision
 * @param bunkers - Array of bunkers (sorted by x coordinate)
 * @returns Object with hit flag and optional bunker index
 */
export function checkBunkerCollision(
  shot: ShotRec,
  bunkers: readonly Bunker[]
): { hit: boolean; bunkerIndex?: number } {
  // Play.c:763-766 - Calculate bounding box
  const left = shot.x - BRADIUS
  const right = shot.x + BRADIUS
  const top = shot.y - BRADIUS
  const bot = shot.y + BRADIUS

  // Play.c:767-768 - Skip bunkers to the left of bounding box
  // for (bp=bunkers; bp->x < left; bp++);
  let bp = 0
  for (; bp < bunkers.length && bunkers[bp]!.x < left; bp++) {
    // Empty loop body - just advancing bp
  }

  // Play.c:769-784 - Check bunkers within x range
  // for (; bp->x < right; bp++)
  for (; bp < bunkers.length && bunkers[bp]!.x < right; bp++) {
    const bunker = bunkers[bp]!

    // Play.c:770-774 - Combined condition check (all on one if statement)
    if (
      bunker.alive &&
      bunker.y < bot &&
      bunker.y > top &&
      xyindistance(bunker.x - shot.x, bunker.y - shot.y, BRADIUS) &&
      (bunker.kind >= BUNKROTKINDS ||
        legalAngle(
          bunker.rot,
          bunker.x,
          bunker.y,
          shot.x - (shot.h >> 3),
          shot.y - (shot.v >> 3)
        ))
    ) {
      // Play.c:775-784 - Hit confirmed
      // Note: We don't handle the shot destruction here (Play.c:776-777)
      // That's handled by the caller in moveShipshots

      // Play.c:778-781 - Check for hardy bunker
      // Note: We don't handle hardy bunker logic here since that requires
      // modifying the bunker, which we can't do with readonly array
      // This is handled in the planetSlice reducer instead

      // Play.c:782-783 - kill_bunk(bp); break;
      return { hit: true, bunkerIndex: bp }
    }
  }

  // No collision found
  return { hit: false }
}
