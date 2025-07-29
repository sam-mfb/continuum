import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShipState } from './types'
import { ShipControl } from './types'
import { SHIP } from './constants'

const initialState: ShipState = {
  shiprot: 0,
  fuel: 10000,
  flaming: false,
  flameBlink: 0,
  thrusting: false,
  firing: false,
  bouncing: false,
  refueling: false,
  shielding: false,
  dx: 0,
  dy: 0,
  cartooning: false,
  shipx: 0,
  shipy: 0,
  xslow: 0,
  yslow: 0
}

type ControlAction = {
  controlsPressed: ShipControl[]
  gravity: { x: number; y: number }
}

export const shipSlice = createSlice({
  name: 'ship',
  initialState,
  reducers: {
    initShip: (state, action: PayloadAction<{ x: number; y: number }>) => {
      state.shipx = action.payload.x
      state.shipy = action.payload.y
    },
    updatePosition: (
      state,
      action: PayloadAction<{ x: number; y: number; dx?: number; dy?: number }>
    ) => {
      state.shipx = action.payload.x
      state.shipy = action.payload.y
      if (action.payload.dx !== undefined) state.dx = action.payload.dx
      if (action.payload.dy !== undefined) state.dy = action.payload.dy
    },
    shipControlMovement: (state, action: PayloadAction<ControlAction>) => {
      const { controlsPressed, gravity } = action.payload
      const pressed = new Set(controlsPressed)
      // if (cartooning)
      // 	pressed = read_cartoon();
      // else
      // 	pressed = read_keyboard();

      if (pressed.has(ShipControl.LEFT))
        state.shiprot = (state.shiprot - 1) & 31
      if (pressed.has(ShipControl.RIGHT))
        state.shiprot = (state.shiprot + 1) & 31

      state.flaming = false
      if (pressed.has(ShipControl.THRUST) && state.fuel) {
        /* if bouncing, make weaker to avoid flying through */
        state.dx += (state.bouncing ? 1 : 2) * SHIP.thrustx[state.shiprot]!
        state.dy +=
          (state.bouncing ? 1 : 2) * SHIP.thrustx[(state.shiprot + 24) & 31]!
        if (state.flameBlink) {
          state.flameBlink--
          state.flaming = true
        } else {
          state.flameBlink = 4
        }
        state.thrusting = false
        // fuel_minus(FUELBURN);
        // start_sound(THRU_SOUND);
      } else state.thrusting = false

      state.dx -= (state.dx >> 6) + (state.dx > 0 ? 1 : 0) /* friction	*/
      state.dy -= (state.dy >> 6) + (state.dy > 0 && !state.cartooning ? 1 : 0)
      /* the cartoon was designed for an older, wrong friction model */

      if (!state.bouncing) {
        /* to keep from running through bouncing walls */
        // gravity_vector(globalx, globaly, &xgravity, &ygravity);
        state.dx += gravity.x
        state.dy += gravity.y /* GRAVITY !!!!!!!!!! */
      }
    },

    setFiring: (state, action: PayloadAction<boolean>) => {
      state.firing = action.payload
    },

    moveShip: state => {
      state.xslow += state.dx /* to slow down (and make smooth) */
      state.shipx += state.xslow >> 8
      state.xslow &= 255
      state.yslow += state.dy
      state.shipy += state.yslow >> 8
      state.yslow &= 255
    }
  }
})
