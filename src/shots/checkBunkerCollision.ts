/**
 * Check if a shot hits a bunker
 * Based on orig/Sources/Play.c:763-784 in move_shipshots()
 *
 * STUB IMPLEMENTATION - To be completed later
 */

import type { ShotRec } from './types'
import type { Bunker } from '@/planet/types'

export type BunkerCollisionResult = {
  hit: boolean
  bunkerIndex?: number
  isHardyBunker?: boolean // DIFFBUNK with rot & 3 == 2 that survives
}

/**
 * Check if a shot collides with any bunker
 *
 * @param shot - The shot to check
 * @param bunkers - Array of bunkers to check against
 * @returns Collision result with bunker index if hit
 *
 * TODO: Implement the following logic from Play.c:763-784:
 * - Check bounding box (BRADIUS)
 * - Check precise distance with xyindistance()
 * - Check legal_angle() for non-rotating bunkers
 * - Handle hardy bunkers (DIFFBUNK with special rotation)
 */
export function checkBunkerCollision(
  _shot: ShotRec,
  _bunkers: readonly Bunker[]
): BunkerCollisionResult {
  // STUB - Always return no collision for now
  return { hit: false }
}
