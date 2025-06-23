import type { Action, ThunkAction } from '@reduxjs/toolkit'
import { shipSlice } from '@/ship/shipSlice'
import { shotsSlice } from '@/shots/shotsSlice'
import { ShipControl } from '@/ship/types'
import type { GameState } from './store'

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
    const { ship, screen } = state

    // Calculate global position
    const globalx = screen.screenx + ship.shipx
    const globaly = screen.screeny + ship.shipy

    //	if ( (pressed & KEY_SHIELD) && fuel)
    //	{	shielding = TRUE;
    //		start_sound(SHLD_SOUND);
    //		fuel_minus(FUELSHIELD);
    //		refueling = FALSE;
    //		for(fp=fuels; fp->x < 10000; fp++)
    //		{
    //			xdif = globalx - fp->x;
    //			ydif = globaly - fp->y;
    //			if (fp->alive && xyindist(xdif, ydif, FRADIUS))
    //			{
    //				fp->alive = FALSE;
    //				fp->currentfig = FUELFRAMES;
    //				fuel_minus(-FUELGAIN);	/* wow, a kludge! */
    //				score_plus(SCOREFUEL);
    //				start_sound(FUEL_SOUND);
    //			}
    //		}
    //	}
    //	else
    //		shielding = FALSE;

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
            globaly
          })
        )
      }
    } else {
      dispatch(shipSlice.actions.setFiring(false))
    }
  }
