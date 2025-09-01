/**
 * Check if a shot hits a bunker
 * Based on orig/Sources/Play.c:763-784 in move_shipshots()
 *
 * Assumes bunkers are pre-sorted by X position for optimization
 */

import type { ShotRec } from './types'
import type { Bunker } from '@/planet/types'
import { xyindistance } from './xyindistance'
import { legalAngle } from '@/planet/legalAngle'
import { BRADIUS } from './constants'
import { BUNKROTKINDS } from '@/figs/types'

export type BunkerCollisionResult = {
  hit: boolean
  bunkerIndex?: number
}

/**
 * Check if a shot collides with any bunker
 * Implements the exact algorithm from Play.c:763-784
 *
 * @param shot - The shot to check (must already be moved)
 * @param bunkers - Array of bunkers sorted by X position
 * @returns Collision result with bunker index if hit
 */
export function checkBunkerCollision(
  shot: ShotRec,
  bunkers: readonly Bunker[]
): BunkerCollisionResult {
  // Calculate bounding box (Play.c:763-766)
  const left = shot.x - BRADIUS
  const right = shot.x + BRADIUS
  const top = shot.y - BRADIUS
  const bot = shot.y + BRADIUS

  // Check bunkers using sorted optimization (Play.c:767-769)
  for (let index = 0; index < bunkers.length; index++) {
    const bunker = bunkers[index]!

    // Check for end marker (rot < 0 indicates end of active bunkers)
    if (bunker.rot < 0) {
      break
    }

    // Early exit if bunker is past right boundary (Play.c:769)
    // Since bunkers are sorted by X, no need to check further
    if (bunker.x >= right) {
      break
    }

    // Skip bunkers too far left (Play.c:767-768)
    if (bunker.x < left) {
      continue
    }

    // Alive check (Play.c:770)
    if (!bunker.alive) {
      continue
    }

    // Y-axis bounding box check (Play.c:770)
    // Original: bp->y < bot && bp->y > top
    // Include bunkers where y is between top and bot (exclusive)
    if (!(bunker.y > top && bunker.y < bot)) {
      continue
    }

    // Circular collision check (Play.c:771)
    const dx = bunker.x - shot.x
    const dy = bunker.y - shot.y
    if (!xyindistance(dx, dy, BRADIUS)) {
      continue
    }

    // Angle check for directional bunkers (Play.c:772-774)
    if (bunker.kind < BUNKROTKINDS) {
      // Calculate shot's previous position to determine trajectory
      // Previous position = current - (velocity >> 3)
      const shotPrevX = shot.x - (shot.h >> 3)
      const shotPrevY = shot.y - (shot.v >> 3)

      if (!legalAngle(bunker.rot, bunker.x, bunker.y, shotPrevX, shotPrevY)) {
        continue // Hit from invalid angle
      }
    }
    // Note: Omnidirectional bunkers (kind >= BUNKROTKINDS) skip angle check

    // Collision confirmed! (Play.c:775)
    return { hit: true, bunkerIndex: index }
  }

  // No collision found
  return { hit: false }
}
