import { configureStore, type Action, type ThunkAction } from '@reduxjs/toolkit'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { statusSlice } from '@core/status'
import { ControlAction } from '@core/controls'
import { FUELSHIELD, FRADIUS } from '@core/ship'
import { xyindist } from '@core/shots'
import { gravityVector } from '@core/shared/gravityVector'
import { wallsSlice } from '../walls'

type ControlActionPayload = {
  controlsPressed: ControlAction[]
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, @typescript-eslint/no-unused-vars
function buildBaseStore() {
  return configureStore({
    reducer: {
      ship: shipSlice.reducer,
      shots: shotsSlice.reducer,
      planet: planetSlice.reducer,
      status: statusSlice.reducer,
      walls: wallsSlice.reducer
    }
  })
}

type BaseState = ReturnType<ReturnType<typeof buildBaseStore>['getState']>

export const shipControl =
  (
    action: ControlActionPayload
  ): ThunkAction<void, BaseState, unknown, Action> =>
  (dispatch, getState) => {
    const { controlsPressed } = action
    const pressed = new Set(controlsPressed)

    // Get current state to calculate gravity
    const state = getState()
    const { ship, planet } = state

    // Calculate gravity at ship's current position using gravityVector
    // Based on gravity_vector() call in Play.c:502
    const gravityResult = gravityVector({
      x: ship.globalx,
      y: ship.globaly,
      gravx: planet.gravx,
      gravy: planet.gravy,
      gravityPoints: planet.gravityPoints || [],
      worldwidth: planet.worldwidth,
      worldwrap: planet.worldwrap
    })

    // Convert from xg/yg to x/y for shipControlMovement
    const gravity = { x: gravityResult.xg, y: gravityResult.yg }

    // First dispatch movement control
    dispatch(
      shipSlice.actions.shipControlMovement({ controlsPressed, gravity })
    )

    // Get updated state after movement
    const updatedState = getState()
    const { walls } = updatedState
    const updatedShip = updatedState.ship
    const updatedPlanet = updatedState.planet

    const isShielding =
      pressed.has(ControlAction.SHIELD) && updatedShip.fuel > 0

    // Use global position from updated ship state (set by previous frame's containShip)
    // This matches the original game where ship_control uses globals set by previous frame
    const { globalx, globaly } = updatedShip

    // Get walls as array for collision detection
    const wallsArray = Object.values(
      walls.updatedWalls.length > 0 ? walls.updatedWalls : walls.organizedWalls
    )

    // Handle shield activation - from Play.c:507-527
    if (isShielding) {
      // Activate shield (also stops refueling)
      dispatch(shipSlice.actions.shieldActivate())
      // Consume fuel for shielding
      dispatch(shipSlice.actions.consumeFuel(FUELSHIELD))

      // Collect fuel cells immediately when shield activates (Play.c:512-524)
      const collectedFuels: number[] = []

      updatedPlanet.fuels.forEach((fuel, index) => {
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
        // Award score for each fuel cell collected (Play.c:521)
        for (let i = 0; i < collectedFuels.length; i++) {
          dispatch(statusSlice.actions.scoreFuel())
        }
      }
    } else {
      // Deactivate shield when key released or out of fuel
      dispatch(shipSlice.actions.shieldDeactivate())
    }

    // Handle firing logic - from original shipControl lines 107-132
    /* check for fire */
    if (pressed.has(ControlAction.FIRE)) {
      if (!updatedShip.firing) {
        dispatch(shipSlice.actions.setFiring(true))
        dispatch(
          shotsSlice.actions.initShipshot({
            shielding: updatedShip.shielding,
            shiprot: updatedShip.shiprot,
            dx: updatedShip.dx,
            dy: updatedShip.dy,
            globalx,
            globaly,
            walls: wallsArray,
            worldwidth: updatedPlanet.worldwidth,
            worldwrap: updatedPlanet.worldwrap
          })
        )
      }
    } else {
      dispatch(shipSlice.actions.setFiring(false))
    }
  }
