/**
 * @fileoverview Corresponds to check_for_bounce() from orig/Sources/Play.c:268-287
 * and bounce_ship() from orig/Sources/Play.c:291-328
 *
 * But unlike the original this is completely decoupled from rendering so
 * it just handles the state updates
 */

import type { Store } from '@reduxjs/toolkit'
import type { LineRec } from '@core/walls'
import type { ShipState } from '@core/ship'
import type { Point } from '@core/shared/pt2xy'
import { shipSlice } from '@core/ship'
import { getstrafedir, LINE_KIND, pt2line } from '@core/shared'
import { Collision, type CollisionType } from '@/core/collision'

export type HandleBounceData = {
  kindPointers: Record<number, string | null>
  organizedWalls: Record<string, LineRec>
}

export type HandleBounceDeps = {
  store: Store<{ ship: ShipState } & Record<string, unknown>>
  wallData: HandleBounceData
  worldwidth: number
  collision: CollisionType
}

/**
 * Update physics when ship collides with a bounce wall.
 *
 * @see orig/Sources/Play.c:268-287 check_for_bounce()
 */
export function handleBounceState(deps: HandleBounceDeps): void {
  const { store, wallData, worldwidth, collision } = deps
  const shipState = store.getState().ship

  const { globalx, globaly } = shipState

  // Step 5: Handle collision result
  if (collision === Collision.BOUNCE) {
    // Find the closest bounce wall and calculate norm direction
    // This mimics bounce_ship() from Play.c:291-328
    const result = findClosestBounceWall(
      globalx,
      globaly,
      shipState.unbouncex, // Last safe global position
      shipState.unbouncey,
      wallData,
      worldwidth
    )

    if (result !== null) {
      // Dispatch with the norm value (0-15 direction index)
      store.dispatch(shipSlice.actions.bounceShip({ norm: result.norm }))
    }
  } else {
    // No collision - update last safe position
    // Corresponds to Play.c:283-285
    store.dispatch(
      shipSlice.actions.noBounce({
        globalx: globalx,
        globaly: globaly
      })
    )
  }
}

/**
 * Find the closest bounce wall to the ship and return the norm direction.
 * Corresponds to bounce_ship() at Play.c:302-313 and getstrafedir() at Terrain.c:242-263
 */
function findClosestBounceWall(
  globalx: number,
  globaly: number,
  unbouncex: number,
  unbouncey: number,
  wallData: HandleBounceData,
  _worldwidth: number
): { norm: number } | null {
  const firstBounceId = wallData.kindPointers[LINE_KIND.BOUNCE]
  if (!firstBounceId) return null

  let closestWall: LineRec | null = null
  let minDistance = 1000 // Start with large squared distance like original (Play.c:304)

  // Create Point object for ship position (Play.c:302-303)
  const shipPoint: Point = { h: globalx, v: globaly }

  // Check all bounce walls (Play.c:305-310)
  let lineId: string | null = firstBounceId
  while (lineId !== null) {
    const line: LineRec | undefined = wallData.organizedWalls[lineId]
    if (!line) break

    // Calculate actual distance from ship to line segment using pt2line
    // This matches the original pt2line() call at Play.c:306
    const distance = pt2line(shipPoint, line)

    // Compare squared distances (pt2line returns squared distance)
    if (distance < minDistance) {
      minDistance = distance
      closestWall = line
    }

    lineId = line.nextId
  }

  if (!closestWall) return null

  // Calculate norm using getstrafedir (Play.c:313)
  // The norm should point away from the wall toward unbouncex/unbouncey
  const norm = getstrafedir(closestWall, unbouncex, unbouncey)

  return { norm }
}
