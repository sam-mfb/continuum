import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ShipState } from './types'
import { ShipControl } from './types'
import {
  SHIP,
  DEAD_TIME,
  FUELSTART,
  FUELGAIN,
  FUELBURN,
  SHIPSTART
} from './constants'

// Note: TOTAL_INITIAL_LIVES will be set via preloadedState when creating the store
// Default to 3 here for tests and development
const initialState: ShipState = {
  shiprot: 0,
  fuel: FUELSTART,
  lives: 3, // Will be overridden by preloadedState in production
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
  starty: 0,
  globalx: 0,
  globaly: 0
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
      // Reset position to new level's start position
      state.shipx = action.payload.x
      state.shipy = action.payload.y

      // Reset velocity to zero for new level
      state.dx = 0
      state.dy = 0
      state.xslow = 0
      state.yslow = 0

      // Reset rotation to north
      state.shiprot = 0

      // Reset activity states
      state.flaming = false
      state.flameBlink = 0
      state.thrusting = false
      state.firing = false
      state.bouncing = false
      state.shielding = false

      // If global coordinates provided, initialize unbounce position and global position
      if (
        action.payload.globalx !== undefined &&
        action.payload.globaly !== undefined
      ) {
        state.unbouncex = action.payload.globalx
        state.unbouncey = action.payload.globaly
        state.globalx = action.payload.globalx
        state.globaly = action.payload.globaly
      }
    },
    updatePosition: (
      state,
      action: PayloadAction<{
        x: number
        y: number
        dx?: number
        dy?: number
        globalx?: number
        globaly?: number
      }>
    ) => {
      state.shipx = action.payload.x
      state.shipy = action.payload.y
      if (action.payload.dx !== undefined) state.dx = action.payload.dx
      if (action.payload.dy !== undefined) state.dy = action.payload.dy
      if (action.payload.globalx !== undefined)
        state.globalx = action.payload.globalx
      if (action.payload.globaly !== undefined)
        state.globaly = action.payload.globaly
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
        state.thrusting = true
        // Consume fuel for thrusting (Play.c:490)
        state.fuel = Math.max(0, state.fuel - FUELBURN)
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
      // Decrement lives when ship dies
      if (state.lives > 0) {
        state.lives--
      }
      // Note: Fuel is NOT reset here - that happens on respawn (Play.c:205)
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
      state.fuel = FUELSTART
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
     * Stop the ship's velocity but keep rotation
     * Used when level completes to freeze ship in place during transition
     */
    stopShipMovement: state => {
      state.dx = 0
      state.dy = 0
      state.xslow = 0
      state.yslow = 0

      // turn off thrust and shield
      state.shielding = false
      state.thrusting = false
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
     * Activate shield for one frame as feedback for self-hit
     * Based on Play.c:790 - shielding = TRUE when ship hits itself
     * Note: Shield will deactivate next frame unless SPACE key is held
     */
    activateShieldFeedback: state => {
      state.shielding = true
      // Note: refueling is not affected by feedback activation
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
     * Set lives count (for initialization or game over)
     */
    setLives: (state, action: PayloadAction<number>) => {
      state.lives = action.payload
    },

    /**
     * Award an extra life
     * Based on Play.c when player gets extra ship
     */
    extraLife: state => {
      state.lives++
    },

    /**
     * Reset lives for new game
     */
    resetLives: state => {
      state.lives = SHIPSTART
    },

    /**
     * Reset ship to clean state for new game
     */
    resetShip: state => {
      // Reset all activity flags
      state.flaming = false
      state.flameBlink = 0
      state.thrusting = false
      state.firing = false
      state.bouncing = false
      state.refueling = false
      state.shielding = false

      // Reset velocity
      state.dx = 0
      state.dy = 0
      state.xslow = 0
      state.yslow = 0

      // Reset death counter
      state.deadCount = 0

      // Note: Don't reset lives, position, or fuel - those are set by game initialization
    }
  }
})
