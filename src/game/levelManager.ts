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
import { resetSparksAlive, clearShards } from '@core/explosions'
import { initializeBunkers, initializeFuels } from '@core/planet'
import { BunkerKind } from '@core/figs/types'
import { SCRWTH, TOPMARG, BOTMARG } from '@core/screen'
import { nextLevel, resetGame } from './gameSlice'
import type { GameState } from './gameSlice'

// Extended state that includes game slice
export type ExtendedGameState = CoreGameState & {
  game: GameState
}

/**
 * Check if the current level is complete
 * Based on kill_bunk() from orig/Sources/Play.c:369-377
 * 
 * A level is complete when all non-generator bunkers are destroyed.
 * Generator bunkers (GENERATORBUNK) do not need to be destroyed for mission completion.
 * This allows level designers to create "blocked" indestructible generators.
 * 
 * From Play.c:369-372:
 *   missioncomplete = TRUE;
 *   for(bp=bunkers; bp->rot >= 0; bp++)
 *       if (bp->alive && bp->kind != GENERATORBUNK)
 *           missioncomplete = FALSE;
 * 
 * For levels with no bunkers, check if all fuel cells are collected.
 */
export function checkLevelComplete(state: ExtendedGameState): boolean {
  // Don't check if already complete
  if (state.game.levelComplete) {
    return false
  }

  const { bunkers, fuels } = state.planet

  // Implement mission completion logic from Play.c:369-372
  // Check if all non-generator bunkers are destroyed
  const allNonGeneratorBunkersDestroyed = bunkers.every(
    bunker => 
      bunker.rot < 0 || // rot < 0 is sentinel marker
      !bunker.alive ||  // bunker is destroyed
      bunker.kind === BunkerKind.GENERATOR // Play.c:371 - generators don't count
  )

  // Check if all fuel cells are collected
  const allFuelsCollected = fuels.every(fuel => !fuel.alive)

  // Check if there are any non-generator bunkers in the level
  const hasNonGeneratorBunkers = bunkers.some(
    b => b.rot >= 0 && b.kind !== BunkerKind.GENERATOR
  )

  if (hasNonGeneratorBunkers) {
    return allNonGeneratorBunkersDestroyed
  } else {
    // No regular bunkers, only generators or fuel - check fuel collection
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
  if (
    state.game.galaxyHeader &&
    state.game.currentLevel >= state.game.galaxyHeader.planets
  ) {
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
}
