import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { PlanetState } from './types'
import { BunkerKind } from './types'
import { BUNKROTKINDS, FUELFRAMES } from '@core/figs'
import { PLANET } from './constants'
import { aimBunk } from '@core/shots'
import { rint } from '@core/shared'

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
  craters: [],
  gravityPoints: [],
  wallsSorted: false
}

export const planetSlice = createSlice({
  name: 'planet',
  initialState,
  reducers: {
    loadPlanet: (_state, action: PayloadAction<PlanetState>) => {
      // Ensure fuels array exists
      const newState = action.payload
      if (!newState.fuels) {
        newState.fuels = []
      }
      // Ensure gravityPoints array exists
      if (!newState.gravityPoints) {
        newState.gravityPoints = []
      }
      return newState
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
     * Initialize bunkers with deterministic random values
     * For use with RandomService to enable deterministic gameplay
     */
    initializeBunkersWithValues: (
      state,
      action: {
        payload: Array<{
          index: number
          rot: number
          rotcount: number
        }>
      }
    ) => {
      // First, sort bunkers by X position for collision optimization
      let sentinelIndex = state.bunkers.findIndex(b => b.rot < 0)
      if (sentinelIndex === -1) sentinelIndex = state.bunkers.length

      const activeBunkers = state.bunkers.slice(0, sentinelIndex)
      activeBunkers.sort((a, b) => a.x - b.x)
      state.bunkers.splice(0, sentinelIndex, ...activeBunkers)

      // Apply provided random values
      for (const { index, rot, rotcount } of action.payload) {
        const bunk = state.bunkers[index]
        if (!bunk || bunk.rot < 0) continue

        bunk.alive = true

        if (bunk.kind >= BUNKROTKINDS) {
          bunk.rot = rot
          bunk.rotcount = rotcount
        }

        if (bunk.kind === BunkerKind.DIFF && (bunk.rot & 3) === 2) {
          bunk.rotcount = 3
        }
      }

      // Initialize gravity points
      state.gravityPoints = []
      for (const bunk of state.bunkers) {
        if (bunk.rot < 0) break
        if (bunk.alive && bunk.kind === BunkerKind.GENERATOR) {
          state.gravityPoints.push({ x: bunk.x, y: bunk.y, str: -10 })
        }
      }
    },

    /**
     * Initialize bunkers for a new planet/game
     * Based on init_planet() at Play.c:137-147
     *
     * ROBUSTNESS: Also sorts bunkers by X position to optimize collision detection
     * Original assumes bunkers are pre-sorted from editor (Play.c:767-769)
     * NOTE: Uses Math.random() - deprecated for deterministic gameplay
     */
    initializeBunkers: state => {
      // First, sort bunkers by X position for collision optimization
      // This ensures the optimization in Play.c:767-769 works correctly
      // IMPORTANT: Only sort active bunkers (those with rot >= 0)
      // The sentinel bunker (rot < 0) must remain at the end

      // Find the sentinel index (first bunker with rot < 0)
      let sentinelIndex = state.bunkers.findIndex(b => b.rot < 0)
      if (sentinelIndex === -1) sentinelIndex = state.bunkers.length

      // Sort only the active bunkers (before sentinel)
      const activeBunkers = state.bunkers.slice(0, sentinelIndex)
      activeBunkers.sort((a, b) => a.x - b.x)

      // Replace the active portion while keeping sentinel at end
      state.bunkers.splice(0, sentinelIndex, ...activeBunkers)

      for (let i = 0; i < state.bunkers.length; i++) {
        const bunk = state.bunkers[i]!

        // Check for end marker
        if (bunk.rot < 0) break

        // Set all bunkers to alive
        bunk.alive = true

        // For animated bunkers, set random initial rotation and counter
        // NOTE: Uses Math.random() - deprecated for deterministic gameplay
        // Use initializeBunkersWithValues instead for deterministic behavior
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

      // Initialize gravity points from generator bunkers
      // Based on init_gravity() from Play.c:568-583
      state.gravityPoints = []
      for (const bunk of state.bunkers) {
        // Check for end marker
        if (bunk.rot < 0) break

        if (bunk.alive && bunk.kind === BunkerKind.GENERATOR) {
          state.gravityPoints.push({
            x: bunk.x,
            y: bunk.y,
            str: -(bunk.ranges[0]?.low ?? 0) // Negated strength from ranges[0].low
          })
        }
      }
    },

    /**
     * Update fuel cell animations with deterministic random values
     * For use with RandomService to enable deterministic gameplay
     */
    updateFuelAnimationsWithRandom: (
      state,
      action: PayloadAction<{
        flash: number
        flashFrame: number
      }>
    ) => {
      const { flash, flashFrame } = action.payload

      // Check if fuels array exists and has elements
      if (!state.fuels || state.fuels.length === 0) return

      // Update animations for all fuel cells (Terrain.c:274-286)
      for (let f = 0; f < state.fuels.length; f++) {
        const fp = state.fuels[f]

        // Skip undefined or null elements
        if (!fp) continue

        // Check for end marker
        if (fp.x >= 10000) break

        // Only animate if fuel is alive
        if (fp.alive) {
          if (f === flash) {
            // Flash effect - use provided random frame (Terrain.c:277-280)
            fp.currentfig = flashFrame
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
     * Update fuel cell animations
     * Based on the for loop in do_fuels() at Terrain.c:274-286
     * NOTE: Uses rint() (Math.random) - deprecated for deterministic gameplay
     */
    updateFuelAnimations: state => {
      // Check if fuels array exists and has elements
      if (!state.fuels || state.fuels.length === 0) return

      // Random fuel to flash this frame (Terrain.c:272)
      const flash = rint(state.fuels.length)

      // Update animations for all fuel cells (Terrain.c:274-286)
      for (let f = 0; f < state.fuels.length; f++) {
        const fp = state.fuels[f]

        // Skip undefined or null elements
        if (!fp) continue

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
    initializeFuelsWithValues: (
      state,
      action: {
        payload: Array<{
          index: number
          currentfig: number
          figcount: number
        }>
      }
    ) => {
      // Check if fuels array exists and has elements
      if (!state.fuels || state.fuels.length === 0) return

      for (const { index, currentfig, figcount } of action.payload) {
        const fp = state.fuels[index]
        if (!fp || fp.x >= 10000) continue

        fp.alive = true
        fp.currentfig = currentfig
        fp.figcount = figcount
      }
    },

    initializeFuels: state => {
      // Legacy action that uses Math.random() - deprecated for deterministic gameplay
      // Use initializeFuelsWithValues or the initializeFuels thunk instead
      if (!state.fuels || state.fuels.length === 0) return

      for (let i = 0; i < state.fuels.length; i++) {
        const fp = state.fuels[i]
        if (!fp) continue
        if (fp.x >= 10000) break

        fp.alive = true
        fp.currentfig = rint(FUELFRAMES)
        fp.figcount = rint(FUELFCYCLES)
      }
    },

    /**
     * Kill a bunker - handles both normal and difficult bunkers
     * Based on kill_bunk() from orig/Sources/Play.c:351-368 and Play.c:778-781
     *
     * For difficult bunkers (DIFFBUNK with rot&3==2), requires 3 hits to destroy
     * For all other bunkers, destroys immediately
     */
    killBunker: (state, action: PayloadAction<{ index: number }>) => {
      const bunker = state.bunkers[action.payload.index]
      if (!bunker || !bunker.alive) return

      // Check for difficult bunker (Play.c:778-781)
      // DIFFBUNK with (rot & 3) == 2 is "hard to kill"
      if (bunker.kind === BunkerKind.DIFF && (bunker.rot & 3) === 2) {
        // Ensure rotcount is initialized (should be 3 from level init)
        if (!bunker.rotcount || bunker.rotcount <= 0) {
          bunker.rotcount = 3
        }

        // Decrement hit count
        bunker.rotcount--

        // If still has hits remaining, bunker survives
        if (bunker.rotcount > 0) {
          return // Bunker takes damage but doesn't die
        }
      }

      // Destroy the bunker
      bunker.alive = false

      // Create crater for omnidirectional bunkers
      // From Play.c:357-361: if (bp->kind >= BUNKROTKINDS)
      if (bunker.kind >= BUNKROTKINDS && state.numcraters < PLANET.NUMCRATERS) {
        state.craters[state.numcraters] = {
          x: bunker.x,
          y: bunker.y
        }
        state.numcraters++
      }

      // Reset gravity if generator destroyed (Play.c:363-364)
      if (bunker.kind === BunkerKind.GENERATOR) {
        // Recalculate gravity points from remaining alive generators
        // Based on init_gravity() from Play.c:568-583
        state.gravityPoints = []
        for (const bunk of state.bunkers) {
          // Check for end marker
          if (bunk.rot < 0) break

          if (bunk.alive && bunk.kind === BunkerKind.GENERATOR) {
            state.gravityPoints.push({
              x: bunk.x,
              y: bunk.y,
              str: -(bunk.ranges[0]?.low ?? 0) // Negated strength from ranges[0].low
            })
          }
        }
      }

      // Note: Explosion and score handled separately from game loop
    },

    /**
     * Mark fuel cells as collected when shield activates near them
     * Based on Play.c:512-524 - fuel collection during shield activation
     *
     * @param indices - Array of fuel cell indices to collect
     */
    collectFuelCells: (state, action: PayloadAction<number[]>) => {
      const indices = action.payload
      indices.forEach(index => {
        const fuel = state.fuels[index]
        if (fuel && fuel.alive) {
          fuel.alive = false
          fuel.currentfig = FUELFRAMES // Start explosion animation (8 frames)
          // Note: Actual fuel addition to ship is handled by shipSlice.collectFuel
          // TODO: Play FUEL_SOUND (Play.c:522)
          // TODO: Add SCOREFUEL to score (Play.c:521)
        }
      })
    }
  }
})

export const {
  loadPlanet,
  updateBunkerRotations,
  initializeBunkers,
  initializeBunkersWithValues,
  updateFuelAnimations,
  updateFuelAnimationsWithRandom,
  initializeFuels,
  initializeFuelsWithValues,
  killBunker,
  collectFuelCells
} = planetSlice.actions
export default planetSlice.reducer
