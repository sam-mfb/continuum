/**
 * @fileoverview Corresponds to check_for_bounce() from orig/Sources/Play.c:268-287
 * and bounce_ship() from orig/Sources/Play.c:291-328
 *
 * But unlike the original this is completely decoupled from rendering so
 * it just handles the state updates
 */

import type { Store } from '@reduxjs/toolkit'
import type { ShipState } from '@core/ship'
import { shipSlice } from '@core/ship'
import { Collision, type CollisionType } from '@/core/collision'
import {
  findClosestBounceWall,
  type WallData as HandleBounceData
} from './findClosestBounceWall'

export type { HandleBounceData }

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
