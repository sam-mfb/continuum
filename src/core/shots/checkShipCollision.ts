/**
 * Check if a shot hits the player's own ship (friendly fire)
 * Based on orig/Sources/Play.c:785-795 in move_shipshots()
 */

import type { ShotRec } from './types'
import { xyindist } from './xyindist'
import { SCENTER } from '@core/figs/types'

export type ShipCollisionResult = {
  hit: boolean
  activateShield?: boolean
}

/**
 * Check if a shot collides with the player's ship
 * This can happen when the player shoots and the bullet comes back to hit them
 *
 * @param shot - The shot to check
 * @param shipPosition - Ship's current global position
 * @param shipAlive - Whether the ship is alive (!dead_count in original)
 * @returns Collision result indicating if shield should activate
 *
 * Implementation from Play.c:785-795:
 * - Check bounding box first for optimization
 * - Use xyindist() with SCENTER radius for precise check
 * - Only check if ship is alive
 * - Auto-activate shield on hit
 */
export function checkShipCollision(
  shot: ShotRec,
  shipPosition: { x: number; y: number },
  shipAlive: boolean
): ShipCollisionResult {
  // Only check if ship is alive (Play.c:788)
  if (!shipAlive) {
    return { hit: false }
  }

  // Bounding box check for optimization (Play.c:785-786)
  // Using SCENTER (15) as the radius around ship center
  const left = shipPosition.x - SCENTER
  const right = shipPosition.x + SCENTER
  const top = shipPosition.y - SCENTER
  const bot = shipPosition.y + SCENTER

  // Check if shot is within bounding box
  if (shot.x <= left || shot.x >= right || shot.y <= top || shot.y >= bot) {
    return { hit: false }
  }

  // Precise distance check (Play.c:787)
  // Use SCENTER (15) as radius, not SHRADIUS (12) which is for shield protection
  const xdif = shot.x - shipPosition.x
  const ydif = shot.y - shipPosition.y

  if (xyindist(xdif, ydif, SCENTER)) {
    // Shot hit the ship - shield feedback will be activated (Play.c:790)
    return { hit: true, activateShield: true }
  }

  return { hit: false }
}
