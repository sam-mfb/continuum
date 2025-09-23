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
import { initializeBunkers, initializeFuels } from '@core/planet'
import { SCRWTH, TOPMARG, BOTMARG } from '@core/screen'
import { clearLevelComplete } from './gameSlice'
import { setMessage } from '@/core/status'

/**
 * Load a specific level (planet) from the galaxy data
 */
export const loadLevel =
  (levelNum: number): ThunkAction<void, RootState, GameServices, Action> =>
  (dispatch, _getState, { galaxyService }) => {
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

    // Initialize bunkers and fuels
    dispatch(initializeBunkers())
    dispatch(initializeFuels())

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
