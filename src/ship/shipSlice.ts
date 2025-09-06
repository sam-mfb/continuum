import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShipState } from './types'
import { ShipControl } from './types'
import { SHIP, DEAD_TIME, STARTING_FUEL, FUELGAIN } from './constants'

const initialState: ShipState = {
  shiprot: 0,
  fuel: 10000,
  flaming: false,
  flameBlink: 0,
  thrusting: false,
  firing: false,
  bouncing: false,
  refueling: false, // Note: This variable exists in the original game (Play.c:72) but was never actually used (always FALSE)
  shielding: false,
  dx: 0,
  dy: 0,
  cartooning: false,
  shipx: 0,
  shipy: 0,
  xslow: 0,
  yslow: 0,
  unbouncex: 0,
  unbouncey: 0,
  deadCount: 0,
  startx: 0,
  starty: 0
}

type ControlAction = {
  controlsPressed: ShipControl[]
  gravity: { x: number; y: number }
}

export const shipSlice = createSlice({
  name: 'ship',
  initialState,
  reducers: {
    initShip: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        globalx?: number
        globaly?: number
      }>
    ) => {
      state.shipx = action.payload.x
      state.shipy = action.payload.y
      // If global coordinates provided, initialize unbounce position
      if (
        action.payload.globalx !== undefined &&
        action.payload.globaly !== undefined
      ) {
        state.unbouncex = action.payload.globalx
        state.unbouncey = action.payload.globaly
      }
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
    },

    resetShip: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        globalx?: number
        globaly?: number
      }>
    ) => {
      // Reset position
      state.shipx = action.payload.x
      state.shipy = action.payload.y
      // Reset velocity
      state.dx = 0
      state.dy = 0
      state.xslow = 0
      state.yslow = 0
      // Reset rotation
      state.shiprot = 0
      // Reset states
      state.flaming = false
      state.flameBlink = 0
      state.thrusting = false
      state.firing = false
      state.bouncing = false
      state.shielding = false
      // Reset unbounce position if global coords provided
      if (
        action.payload.globalx !== undefined &&
        action.payload.globaly !== undefined
      ) {
        state.unbouncex = action.payload.globalx
        state.unbouncey = action.payload.globaly
      }
      // Keep fuel as is
    },

    bounceShip: (
      state,
      action: PayloadAction<{
        norm: number // Direction index (0-15) pointing away from wall
      }>
    ) => {
      const { norm } = action.payload

      // Exact implementation of bounce_ship() from orig/Sources/Play.c:291-328
      // Get bounce vector components from the norm direction
      const x1 = SHIP.bounce_vecs[norm]!
      const y1 = SHIP.bounce_vecs[(norm + 12) & 15]! // 12 positions = 270 degrees in 16-direction system

      // Calculate dot product of velocity with bounce direction
      // Using Long integers like original (dot is 'register long')
      const dot = state.dx * x1 + state.dy * y1

      // Check if velocity toward wall is below threshold (Play.c:317)
      if (dot < 256 * 64) {
        // 256*64 = 16384
        // Calculate bounce force
        let absDot = dot < 0 ? -dot : dot // Play.c:319-320

        // Minimum bounce force (Play.c:321-322)
        if (absDot < 10 * 256) {
          absDot = 10 * 256 // 2560
        }

        // Apply bounce kick (Play.c:323-326)
        // Original uses division by (24*48) = 1152
        const xkick = Math.floor((x1 * absDot) / (24 * 48))
        const ykick = Math.floor((y1 * absDot) / (24 * 48))

        state.dx += xkick
        state.dy += ykick
      }

      // Set bouncing flag (Play.c:277)
      state.bouncing = true
    },

    noBounce: (
      state,
      action: PayloadAction<{ globalx: number; globaly: number }>
    ) => {
      state.bouncing = false
      // Store global coordinates like original (Play.c:284-285)
      state.unbouncex = action.payload.globalx
      state.unbouncey = action.payload.globaly
    },

    /**
     * Kill the ship - based on kill_ship() in Play.c:685-700
     */
    killShip: state => {
      state.deadCount = DEAD_TIME // Start death countdown
      state.flaming = false // Stop all ship activities
      state.thrusting = false
      state.refueling = false
      state.shielding = false
      // Note: vx (dx), vy (dy) preserved - ship continues drifting while dead
    },

    /**
     * Decrement the death counter
     */
    decrementDeadCount: state => {
      if (state.deadCount > 0) {
        state.deadCount--
      }
    },

    /**
     * Respawn the ship at planet start position after death
     * Based on orig/Sources/Play.c:203-207 which calls init_ship
     * init_ship (Play.c:173-174) resets to xstart, ystart
     */
    respawnShip: state => {
      // Center ship on screen
      state.shipx = 128 // SCRWTH / 2
      state.shipy = 96 // (TOPMARG + BOTMARG) / 2
      // Note: Screen position must be updated by caller to place ship at start
      // screenx = startx - shipx, screeny = starty - shipy

      // Reset movement
      state.dx = 0
      state.dy = 0
      state.xslow = 0
      state.yslow = 0
      // Reset rotation to north
      state.shiprot = 0
      // Reset fuel
      state.fuel = STARTING_FUEL
      // Reset activity states
      state.flaming = false
      state.flameBlink = 0
      state.thrusting = false
      state.firing = false
      state.bouncing = false
      state.refueling = false
      state.shielding = false
    },

    /**
     * Set the ship's start/respawn position
     */
    setStartPosition: (
      state,
      action: PayloadAction<{ x: number; y: number }>
    ) => {
      state.startx = action.payload.x
      state.starty = action.payload.y
    },

    /**
     * Activate shield
     * Based on Play.c:508, 511
     */
    shieldActivate: state => {
      state.shielding = true
      state.refueling = false // Stop refueling when shield is active (Play.c:511)
    },

    /**
     * Deactivate shield
     * Based on Play.c:527
     */
    shieldDeactivate: state => {
      state.shielding = false
    },

    /**
     * Start refueling
     * Based on Play.c refueling logic
     */
    refuelingOn: state => {
      state.refueling = true
    },

    /**
     * Stop refueling
     * Based on Play.c:511
     */
    refuelingOff: state => {
      state.refueling = false
    },

    /**
     * Consume fuel (for thrusting or shielding)
     * Based on fuel_minus() in Play.c
     */
    consumeFuel: (state, action: PayloadAction<number>) => {
      state.fuel = Math.max(0, state.fuel - action.payload)
      if (state.fuel === 0) {
        // If out of fuel, can't shield anymore
        state.shielding = false
      }
    },

    /**
     * Collect fuel cells
     * Based on fuel_minus(-FUELGAIN) in Play.c:520
     * @param numCells - Number of fuel cells collected
     */
    collectFuel: (state, action: PayloadAction<number>) => {
      state.fuel += action.payload * FUELGAIN
    },

    /**
     * Activate shield feedback for one frame when hit by own bullet
     * Based on Play.c:790
     */
    activateShieldFeedback: state => {
      state.shielding = true
      // Note: Will be deactivated next frame unless SHIELD key is held
    }
  }
})
