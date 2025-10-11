/**
 * @fileoverview Corresponds to check_for_bounce() from orig/Sources/Play.c:268-287
 * and bounce_ship() from orig/Sources/Play.c:291-328
 */

import type { Store } from '@reduxjs/toolkit'
import type { MonochromeBitmap } from '@core/walls'
import type { ShipState } from '@core/ship'
import { blackTerrain } from '@render/walls'
import { checkFigure, shipSlice } from '@core/ship'
import { eraseFigure } from '@render/ship'
import { SCENTER } from '@core/figs'
import { LINE_KIND } from '@core/shared'
import {
  findClosestBounceWall,
  type WallData as CheckForBounceData
} from './findClosestBounceWall'

export type { CheckForBounceData }

export type CheckForBounceDeps = {
  screen: MonochromeBitmap
  store: Store<{ ship: ShipState } & Record<string, unknown>>
  shipDef: MonochromeBitmap
  wallData: CheckForBounceData
  viewport: { x: number; y: number; b: number; r: number }
  worldwidth: number
}

/**
 * Check if ship is colliding with bounce walls and update physics accordingly.
 * This is both a render and state function - it adds bounce walls to the screen
 * and updates the ship's physics state if a collision is detected.
 *
 * @see orig/Sources/Play.c:268-287 check_for_bounce()
 */
export function checkForBounce(deps: CheckForBounceDeps): MonochromeBitmap {
  const { screen, store, shipDef, wallData, viewport, worldwidth } = deps
  const shipState = store.getState().ship

  const { globalx, globaly } = shipState

  // Step 1: Check if there's already a collision before adding bounce walls
  // This would be a collision with ghost walls or other non-bounce elements
  const preExistingCollision = checkFigure(screen, {
    x: shipState.shipx - SCENTER,
    y: shipState.shipy - SCENTER,
    height: 32, // SHIPHT
    def: shipDef
  })

  // Step 2: Render bounce walls onto the screen
  // This corresponds to black_terrain(L_BOUNCE) at Play.c:272
  const screenWithBounceWalls = blackTerrain({
    thekind: LINE_KIND.BOUNCE,
    kindPointers: wallData.kindPointers,
    organizedWalls: wallData.organizedWalls,
    viewport,
    worldwidth
  })(screen)

  // Step 3: Check for collision after adding bounce walls
  // This corresponds to check_figure() at Play.c:274
  const collisionAfterBounce = checkFigure(screenWithBounceWalls, {
    x: shipState.shipx - SCENTER,
    y: shipState.shipy - SCENTER,
    height: 32, // SHIPHT
    def: shipDef
  })

  // Step 4: Only bounce if the collision is NEW (caused by bounce walls, not ghost walls)
  const collision = !preExistingCollision && collisionAfterBounce

  // Step 5: Handle collision result
  if (collision) {
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

    // CRITICAL: Erase the ship from the screen after bounce detection!
    // This corresponds to Play.c:278-279
    // This prevents the later fatal collision check from triggering on bounce walls
    const screenWithErasedShip = eraseFigure({
      x: shipState.shipx - SCENTER,
      y: shipState.shipy - SCENTER,
      def: shipDef
    })(screenWithBounceWalls)

    return screenWithErasedShip
  } else {
    // No collision - update last safe position
    // Corresponds to Play.c:283-285
    store.dispatch(
      shipSlice.actions.noBounce({
        globalx: globalx,
        globaly: globaly
      })
    )

    // Return the screen with bounce walls rendered (ship not erased)
    return screenWithBounceWalls
  }
}
