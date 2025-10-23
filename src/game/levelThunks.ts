/**
 * @fileoverview Level loading thunk for Redux
 */

import type { ThunkAction, Action } from '@reduxjs/toolkit'
import type { RootState, GameServices } from './store'
import { planetSlice } from '@core/planet'
import { shipSlice } from '@core/ship'
import { screenSlice } from '@core/screen'
import { wallsSlice } from '@core/walls'
import { statusSlice } from '@core/status'
import { clearAllShots } from '@core/shots'
import { resetSparksAlive, clearShards } from '@core/explosions'
import { SCRWTH, TOPMARG, BOTMARG } from '@core/screen'
import { clearLevelComplete } from './gameSlice'
import { setMessage } from '@/core/status'
import { FUELFRAMES } from '@core/figs'

const FUELFCYCLES = 3 // From GW.h - cycles each frame stays
const BUNKFRAMES = 8 // From GW.h - bunker animation frames
const BUNKFCYCLES = 4 // From GW.h - bunker rotation counter cycles
const BUNKROTKINDS = 2 // From GW.h - bunker kinds that rotate

/**
 * Load a specific level (planet) from the galaxy data
 *
 * @param levelNum - The level number to load
 * @param overrideSeed - Optional seed to use instead of Date.now() (for replay/validation)
 */
export const loadLevel =
  (
    levelNum: number,
    overrideSeed?: number
  ): ThunkAction<void, RootState, GameServices, Action> =>
  (dispatch, _getState, { galaxyService, randomService, recordingService }) => {
    // Set random seed at the start of each level
    // Priority:
    // 1. overrideSeed (explicit parameter)
    // 2. replaySeed (from recording during replay)
    // 3. Date.now() (for new games)
    const replaySeed = recordingService.getLevelSeed(levelNum)
    const seed =
      overrideSeed !== undefined
        ? overrideSeed
        : replaySeed !== null
          ? replaySeed
          : Date.now()
    randomService.setSeed(seed)

    // Record level seed if recording is active (only record if we generated the seed)
    if (
      recordingService.isRecording() &&
      overrideSeed === undefined &&
      replaySeed === null
    ) {
      recordingService.recordLevelSeed(levelNum, seed)
    }

    // Update the current level in status state to match what we're loading
    dispatch(statusSlice.actions.setLevel(levelNum))

    // Reset level complete flag and status message for the new level
    dispatch(clearLevelComplete())
    dispatch(setMessage(null))

    // Get the planet data for this level from the service
    const planet = galaxyService.getPlanet(levelNum)

    console.log(`Loading level ${levelNum}:`, {
      dimensions: `${planet.worldwidth}x${planet.worldheight}`,
      start: `(${planet.xstart}, ${planet.ystart})`,
      walls: planet.lines.length,
      wallsSorted: planet.wallsSorted,
      bunkers: planet.bunkers.filter(b => b.rot >= 0).length,
      fuels: planet.fuels.length
    })

    // Initialize planet
    dispatch(planetSlice.actions.loadPlanet(planet))

    // Initialize walls
    dispatch(wallsSlice.actions.initWalls({ walls: planet.lines }))

    // Initialize bunkers with deterministic random values from RandomService
    let state = _getState()
    const bunkers = state.planet.bunkers
    const bunkerValues: Array<{
      index: number
      rot: number
      rotcount: number
    }> = []

    for (let i = 0; i < bunkers.length; i++) {
      const bunk = bunkers[i]
      if (!bunk || bunk.rot < 0) break

      // For animated bunkers, generate random rotation values
      if (bunk.kind >= BUNKROTKINDS) {
        bunkerValues.push({
          index: i,
          rot: randomService.rnumber(BUNKFRAMES),
          rotcount: randomService.rnumber(BUNKFCYCLES)
        })
      } else {
        // Non-animated bunkers still need an entry but won't use rot/rotcount
        bunkerValues.push({
          index: i,
          rot: bunk.rot,
          rotcount: 0
        })
      }
    }

    dispatch(planetSlice.actions.initializeBunkersWithValues(bunkerValues))

    // Initialize fuels with deterministic random values from RandomService
    state = _getState()
    const fuels = state.planet.fuels
    const fuelValues: Array<{
      index: number
      currentfig: number
      figcount: number
    }> = []

    for (let i = 0; i < fuels.length; i++) {
      const fp = fuels[i]
      if (!fp || fp.x >= 10000) break

      fuelValues.push({
        index: i,
        currentfig: randomService.rnumber(FUELFRAMES),
        figcount: randomService.rnumber(FUELFCYCLES)
      })
    }

    dispatch(planetSlice.actions.initializeFuelsWithValues(fuelValues))

    // Set planet bonus for this level (don't reset score!)
    dispatch(statusSlice.actions.setPlanetBonus(planet.planetbonus))
    // Level is shown from game state now, not status slice

    // Initialize ship at center of screen
    const shipScreenX = SCRWTH / 2
    const shipScreenY = Math.floor((TOPMARG + BOTMARG) / 2)

    dispatch(
      shipSlice.actions.initShip({
        x: shipScreenX,
        y: shipScreenY,
        globalx: planet.xstart,
        globaly: planet.ystart
      })
    )

    // Set respawn position
    dispatch(
      shipSlice.actions.setStartPosition({
        x: shipScreenX,
        y: shipScreenY
      })
    )

    // Initialize screen position
    dispatch(
      screenSlice.actions.setPosition({
        x: planet.xstart - shipScreenX,
        y: planet.ystart - shipScreenY
      })
    )

    // Clear all shots and explosions
    dispatch(clearAllShots())
    dispatch(resetSparksAlive())
    dispatch(clearShards())
  }
