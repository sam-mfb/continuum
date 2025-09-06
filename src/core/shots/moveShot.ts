/**
 * Shot movement physics
 * Based on orig/Sources/Play.c move_shot() (lines 848-874)
 */

import type { ShotRec } from './types'

/**
 * Update shot position based on velocity
 * Handles world wrapping and boundary checks
 *
 * @param shot - The shot to move
 * @param env - Environment parameters (world size and wrapping)
 * @returns Updated shot with new position
 */
export function moveShot(
  shot: ShotRec,
  env: {
    worldwidth: number
    worldwrap: boolean
  }
): ShotRec {
  // Don't move expired shots
  if (shot.lifecount <= 0) {
    return shot
  }

  const sp = { ...shot }
  const worldwth8 = env.worldwidth << 3

  // Decrement lifetime
  sp.lifecount--

  // Update position with velocity (in 1/8 pixel units)
  let x = sp.x8 + sp.h
  let y = sp.y8 + sp.v

  // Check vertical boundary (top of world)
  if (y < 0) {
    sp.lifecount = 0
  }

  // Check horizontal boundaries with wrapping
  if (x < 0) {
    if (env.worldwrap) {
      x += worldwth8
    } else {
      sp.lifecount = 0
    }
  } else if (x >= worldwth8) {
    if (env.worldwrap) {
      x -= worldwth8
    } else {
      sp.lifecount = 0
    }
  }

  // Update high-precision position
  sp.x8 = x
  sp.y8 = y

  // Convert to pixel position for drawing/collision
  sp.x = x >> 3
  sp.y = y >> 3

  return sp
}
