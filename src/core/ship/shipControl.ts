import type { Action, ThunkAction } from '@reduxjs/toolkit'
import type { GameState } from '@dev/store'
import { shipSlice } from '@core/ship'
import { shotsSlice } from '@core/shots'
import { planetSlice } from '@core/planet'
import { statusSlice } from '@core/status'
import { ShipControl } from '@core/ship'
import { FUELSHIELD, FRADIUS } from '@core/ship'
import { xyindist } from '@core/shots'
import { gravityVector } from '@core/shared/gravityVector'
import {
  playDiscrete,
  setThrusting,
  setShielding
} from '@core/sound/soundSlice'
import { SoundType } from '@core/sound/constants'

type ControlAction = {
  controlsPressed: ShipControl[]
}

export const shipControl =
  (action: ControlAction): ThunkAction<void, GameState, unknown, Action> =>
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

    // Determine which continuous sounds should be playing
    // Priority: Shield takes precedence over thrust when both are pressed
    const isThrusting = pressed.has(ShipControl.THRUST) && updatedShip.fuel > 0
    const isShielding = pressed.has(ShipControl.SHIELD) && updatedShip.fuel > 0

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
        // Play FUEL_SOUND (Play.c:522)
        dispatch(playDiscrete(SoundType.FUEL_SOUND))
      }
    } else {
      // Deactivate shield when key released or out of fuel
      dispatch(shipSlice.actions.shieldDeactivate())
    }

    // Update continuous sound states
    // Shield has priority over thrust - if both are active, only shield sound plays
    if (isShielding) {
      dispatch(setShielding(true))
      dispatch(setThrusting(false))
    } else if (isThrusting) {
      dispatch(setThrusting(true))
      dispatch(setShielding(false))
    } else {
      dispatch(setThrusting(false))
      dispatch(setShielding(false))
    }

    // Handle firing logic - from original shipControl lines 107-132
    /* check for fire */
    if (pressed.has(ShipControl.FIRE)) {
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
        // Play fire sound only if not shielding - Play.c:551
        if (!updatedShip.shielding) {
          dispatch(playDiscrete(SoundType.FIRE_SOUND))
        }
      }
    } else {
      dispatch(shipSlice.actions.setFiring(false))
    }
  }
