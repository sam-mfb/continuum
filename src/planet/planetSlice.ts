import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PlanetState } from './types'
import { BunkerKind } from './types'
import { BUNKROTKINDS, FUELFRAMES } from '@/figs/types'
import { aimBunk } from '@/shots/aimBunk'
import { rint } from '@/shared/rint'

// Constants from GW.h
const BUNKFRAMES = 8
const BUNKFCYCLES = 2
const FUELFCYCLES = 3 // From GW.h - cycles each frame stays

const initialState: PlanetState = {
  worldwidth: 0,
  worldheight: 0,
  worldwrap: false,
  shootslow: 0,
  xstart: 0,
  ystart: 0,
  planetbonus: 0,
  gravx: 0,
  gravy: 0,
  numcraters: 0,
  lines: [],
  bunkers: [],
  fuels: [],
  craters: []
}

export const planetSlice = createSlice({
  name: 'planet',
  initialState,
  reducers: {
    loadPlanet: (_state, action: PayloadAction<PlanetState>) => {
      return action.payload
    },

    /**
     * Update bunker rotations for animated bunkers
     * Based on the for loop in do_bunkers() at Bunkers.c:32-45
     */
    updateBunkerRotations: (
      state,
      action: PayloadAction<{
        globalx: number
        globaly: number
      }>
    ) => {
      const { globalx, globaly } = action.payload

      for (let i = 0; i < state.bunkers.length; i++) {
        const bunk = state.bunkers[i]!

        // Check for end marker
        if (bunk.rot < 0) break

        // Only process animated bunkers
        if (bunk.kind >= BUNKROTKINDS) {
          // Initialize rotcount if it doesn't exist
          if (bunk.rotcount === undefined) {
            bunk.rotcount = BUNKFCYCLES
          }

          // Decrement rotation counter
          bunk.rotcount--

          // If counter reaches 0, update rotation
          if (bunk.rotcount <= 0) {
            if (bunk.kind === BunkerKind.FOLLOW) {
              // Following bunker tracks the player
              const rotChange = aimBunk(bunk, {
                globalx,
                globaly,
                worldwidth: state.worldwidth,
                worldwrap: state.worldwrap
              })
              bunk.rot += rotChange
              bunk.rot &= BUNKFRAMES - 1
              bunk.rotcount = 3 * BUNKFCYCLES // 3x slower rotation
            } else {
              // Other animated bunkers just rotate
              bunk.rot++
              bunk.rot &= BUNKFRAMES - 1
              bunk.rotcount = BUNKFCYCLES
            }
          }
        }
      }
    },

    /**
     * Initialize bunkers for a new planet/game
     * Based on init_planet() at Play.c:137-147
     */
    initializeBunkers: state => {
      for (let i = 0; i < state.bunkers.length; i++) {
        const bunk = state.bunkers[i]!

        // Check for end marker
        if (bunk.rot < 0) break

        // Set all bunkers to alive
        bunk.alive = true

        // For animated bunkers, set random initial rotation and counter
        if (bunk.kind >= BUNKROTKINDS) {
          // Random rotation (0 to BUNKFRAMES-1)
          bunk.rot = Math.floor(Math.random() * BUNKFRAMES)
          // Random rotation counter (0 to BUNKFCYCLES-1)
          bunk.rotcount = Math.floor(Math.random() * BUNKFCYCLES)
        }

        // Special case: DIFF bunkers with rotation 2 are harder to kill
        if (bunk.kind === BunkerKind.DIFF && (bunk.rot & 3) === 2) {
          bunk.rotcount = 3
        }
      }
    },

    /**
     * Update fuel cell animations
     * Based on the for loop in do_fuels() at Terrain.c:274-286
     */
    updateFuelAnimations: state => {
      // Random fuel to flash this frame (Terrain.c:272)
      const flash = rint(state.fuels.length)

      // Update animations for all fuel cells (Terrain.c:274-286)
      for (let f = 0; f < state.fuels.length; f++) {
        const fp = state.fuels[f]!

        // Check for end marker
        if (fp.x >= 10000) break

        // Only animate if fuel is alive
        if (fp.alive) {
          if (f === flash) {
            // Flash effect - set to one of last two frames (Terrain.c:277-280)
            fp.currentfig = FUELFRAMES - 2 + rint(2)
            fp.figcount = 1
          } else if (fp.figcount <= 0) {
            // Advance to next animation frame (Terrain.c:281-286)
            fp.currentfig++
            if (fp.currentfig >= FUELFRAMES - 2) {
              fp.currentfig = 0
            }
            fp.figcount = 1
          } else {
            // Decrement frame counter
            fp.figcount--
          }
        }
      }
    },

    /**
     * Initialize fuel cells for a new planet/game
     * Based on init_planet() at Play.c:148-153
     */
    initializeFuels: state => {
      for (const fp of state.fuels) {
        // Check for end marker
        if (fp.x >= 10000) break

        // Set all fuels to alive with random animation state
        fp.alive = true
        fp.currentfig = rint(FUELFRAMES)
        fp.figcount = rint(FUELFCYCLES)
      }
    }
  }
})

export const {
  loadPlanet,
  updateBunkerRotations,
  initializeBunkers,
  updateFuelAnimations,
  initializeFuels
} = planetSlice.actions
export default planetSlice.reducer
