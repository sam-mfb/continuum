/**
 * @fileoverview Level progression and management logic
 */

import type { Store } from '@reduxjs/toolkit'
import type { GameState as CoreGameState } from '@dev/store'
import { getGalaxyService } from '@core/galaxy'
import { planetSlice } from '@core/planet'
import { shipSlice } from '@core/ship'
import { screenSlice } from '@core/screen'
import { wallsSlice } from '@core/walls'
import { statusSlice } from '@core/status'
import { clearAllShots } from '@core/shots'
import { 
  resetSparksAlive, 
  clearShards 
} from '@core/explosions'
import {
  initializeBunkers,
  initializeFuels
} from '@core/planet'
import { SCRWTH, TOPMARG, BOTMARG } from '@core/screen'
import { 
  nextLevel, 
  resetGame,
  endTransition
} from './gameSlice'
import { INITIAL_LIVES, LEVEL_COMPLETE_DELAY, GAME_OVER_DELAY } from './constants'
import type { GameState } from './gameSlice'

// Extended state that includes game slice
export type ExtendedGameState = CoreGameState & {
  game: GameState
}

/**
 * Check if the current level is complete
 * A level is complete when all bunkers are destroyed
 * OR all fuel cells are collected (for fuel-only levels)
 */
export function checkLevelComplete(state: ExtendedGameState): boolean {
  // Don't check if already transitioning
  if (state.game.levelComplete || state.game.transitioning) {
    return false
  }

  const { bunkers, fuels } = state.planet

  // Check if all bunkers are destroyed
  const allBunkersDestroyed = bunkers.every(bunker => 
    bunker.rot < 0 || !bunker.alive // rot < 0 is sentinel, !alive means destroyed
  )

  // Check if all fuel cells are collected
  const allFuelsCollected = fuels.every(fuel => !fuel.alive)

  // Level is complete if all bunkers destroyed
  // For levels with no bunkers, check if all fuel is collected
  const hasBunkers = bunkers.some(b => b.rot >= 0)
  
  if (hasBunkers) {
    return allBunkersDestroyed
  } else {
    // Fuel-only level
    return allFuelsCollected
  }
}

/**
 * Load a specific level (planet) from the galaxy data
 */
export function loadLevel(
  store: Store<ExtendedGameState>,
  levelNum: number
): void {
  const state = store.getState()
  const galaxyService = getGalaxyService()
  
  if (!state.game.galaxyHeader || !galaxyService.isLoaded()) {
    console.error('Galaxy data not loaded')
    return
  }

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
  store.dispatch(planetSlice.actions.loadPlanet(planet))

  // Initialize walls
  store.dispatch(wallsSlice.actions.initWalls({ walls: planet.lines }))

  // Initialize bunkers and fuels
  store.dispatch(initializeBunkers())
  store.dispatch(initializeFuels())

  // Set planet bonus for this level (don't reset score!)
  store.dispatch(statusSlice.actions.setPlanetBonus(planet.planetbonus))
  // Level is shown from game state now, not status slice

  // Initialize ship at center of screen
  const shipScreenX = SCRWTH / 2
  const shipScreenY = Math.floor((TOPMARG + BOTMARG) / 2)

  store.dispatch(
    shipSlice.actions.initShip({
      x: shipScreenX,
      y: shipScreenY,
      globalx: planet.xstart,
      globaly: planet.ystart
    })
  )

  // Set respawn position
  store.dispatch(
    shipSlice.actions.setStartPosition({
      x: shipScreenX,
      y: shipScreenY
    })
  )

  // Initialize screen position
  store.dispatch(
    screenSlice.actions.setPosition({
      x: planet.xstart - shipScreenX,
      y: planet.ystart - shipScreenY
    })
  )

  // Clear all shots and explosions
  store.dispatch(clearAllShots())
  store.dispatch(resetSparksAlive())
  store.dispatch(clearShards())
}

/**
 * Handle transitioning to the next level
 */
export function transitionToNextLevel(store: Store<ExtendedGameState>): void {
  const state = store.getState()
  
  // Check if we've completed all levels
  if (state.game.galaxyHeader && 
      state.game.currentLevel >= state.game.galaxyHeader.planets) {
    // Game won! For now, just loop back to level 1
    console.log('Game completed! Restarting from level 1')
    store.dispatch(resetGame())
    loadLevel(store, 1)
  } else {
    // Load next level
    store.dispatch(nextLevel())
    const newLevel = store.getState().game.currentLevel
    loadLevel(store, newLevel)
  }
  
  // End transition
  store.dispatch(endTransition())
}

/**
 * Reset the game to level 1 with initial lives
 */
export function resetToLevelOne(store: Store<ExtendedGameState>): void {
  // Reset game state
  store.dispatch(resetGame())
  
  // Reset lives
  store.dispatch(shipSlice.actions.setLives(INITIAL_LIVES))
  
  // Reset score and status
  store.dispatch(statusSlice.actions.initStatus())
  
  // Load level 1
  loadLevel(store, 1)
  
  // End transition
  store.dispatch(endTransition())
}

/**
 * Handle level complete transition timing
 */
export function handleLevelCompleteTransition(
  store: Store<ExtendedGameState>
): void {
  const state = store.getState()
  
  if (state.game.transitionFrame >= LEVEL_COMPLETE_DELAY) {
    transitionToNextLevel(store)
  }
}

/**
 * Handle game over transition timing
 */
export function handleGameOverTransition(
  store: Store<ExtendedGameState>
): void {
  const state = store.getState()
  
  if (state.game.transitionFrame >= GAME_OVER_DELAY) {
    resetToLevelOne(store)
  }
}