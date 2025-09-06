import type { Action, ThunkAction } from '@reduxjs/toolkit'
import type { GameState } from '@dev/store'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { ShipControl } from '@core/ship'
import { FUELSHIELD, FRADIUS } from '@core/ship'
import { xyindist } from '@core/shots'

type ControlAction = {
  controlsPressed: ShipControl[]
  gravity: { x: number; y: number }
}

export const shipControl =
  (action: ControlAction): ThunkAction<void, GameState, unknown, Action> =>
  (dispatch, getState) => {
    const { controlsPressed, gravity } = action
    const pressed = new Set(controlsPressed)

    // First dispatch movement control
    dispatch(
      shipSlice.actions.shipControlMovement({ controlsPressed, gravity })
    )

    // Get updated state after movement
    const state = getState()
    const { ship, screen, walls, planet } = state

    // Calculate global position
    const globalx = screen.screenx + ship.shipx
    const globaly = screen.screeny + ship.shipy

    // Get walls as array for collision detection
    const wallsArray = Object.values(
      walls.updatedWalls.length > 0 ? walls.updatedWalls : walls.organizedWalls
    )

    // Handle shield activation - from Play.c:507-527
    if (pressed.has(ShipControl.SHIELD) && ship.fuel > 0) {
      // Activate shield (also stops refueling)
      dispatch(shipSlice.actions.shieldActivate())
      // Consume fuel for shielding
      dispatch(shipSlice.actions.consumeFuel(FUELSHIELD))

      // Collect fuel cells immediately when shield activates (Play.c:512-524)
      const collectedFuels: number[] = []

      planet.fuels.forEach((fuel, index) => {
        if (fuel.alive) {
          const xdif = globalx - fuel.x
          const ydif = globaly - fuel.y
          // FRADIUS = 30 (GW.h:138)
          if (xyindist(xdif, ydif, FRADIUS)) {
            collectedFuels.push(index)
          }
        }
      })

      if (collectedFuels.length > 0) {
        // Update planet state - mark fuels as dead and start animation
        dispatch(planetSlice.actions.collectFuelCells(collectedFuels))
        // Add fuel to ship (collectFuel already multiplies by FUELGAIN internally)
        dispatch(shipSlice.actions.collectFuel(collectedFuels.length))
        // TODO: Add score when implemented (Play.c:521 - SCOREFUEL)
        // TODO: Play FUEL_SOUND (Play.c:522)
      }

      // TODO: start_sound(SHLD_SOUND)
    } else {
      // Deactivate shield when key released or out of fuel
      dispatch(shipSlice.actions.shieldDeactivate())
    }

    // Handle firing logic - from original shipControl lines 107-132
    /* check for fire */
    if (pressed.has(ShipControl.FIRE)) {
      if (!ship.firing) {
        dispatch(shipSlice.actions.setFiring(true))
        dispatch(
          shotsSlice.actions.initShipshot({
            shielding: ship.shielding,
            shiprot: ship.shiprot,
            dx: ship.dx,
            dy: ship.dy,
            globalx,
            globaly,
            walls: wallsArray,
            worldwidth: planet.worldwidth,
            worldwrap: planet.worldwrap
          })
        )
      }
    } else {
      dispatch(shipSlice.actions.setFiring(false))
    }
  }
