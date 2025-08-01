import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PlanetState } from './types'
import { BunkerKind } from './types'
import { BUNKROTKINDS } from '@/figs/types'
import { aimBunk } from '@/shots/aimBunk'

// Constants from GW.h
const BUNKFRAMES = 8
const BUNKFCYCLES = 2

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
          // Decrement rotation counter if it exists
          if (bunk.rotcount !== undefined) {
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
      }
    }
  }
})

export const { loadPlanet, updateBunkerRotations } = planetSlice.actions
export default planetSlice.reducer
