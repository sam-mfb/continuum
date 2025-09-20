/**
 * Game Initialization Module
 *
 * Handles the initial game setup including sound service,
 * galaxy loading, and initial state configuration.
 */

import type { Store } from '@reduxjs/toolkit'
import type { SoundUIState } from '@core/sound/soundSlice'
import { getGalaxyService } from '@core/galaxy'
import {
  initializeSoundService,
  cleanupSoundService
} from '@core/sound/service'
import { shipSlice } from '@core/ship'
import { statusSlice } from '@core/status'
import { TOTAL_INITIAL_LIVES } from './constants'
import { loadGalaxyHeader } from './gameSlice'
import { loadLevel } from './levelManager'
import { store, type RootState } from './store'

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

/**
 * Initialize the game on module load
 * Sets up sound service, loads galaxy, and initializes game state
 */
export const initializeGame = async (): Promise<void> => {
  try {
    console.log('Starting game initialization...')

    // Initialize sound service
    console.log('Initializing sound service...')
    try {
      // Get initial sound settings from our store
      const soundState = store.getState().sound as SoundUIState
      await initializeSoundService({
        volume: soundState.volume,
        enabled: soundState.enabled
      })
      console.log('Sound service initialized successfully')
    } catch (soundError) {
      console.warn('Failed to initialize sound service:', soundError)
      // Continue without sound - game is still playable
    }

    // Load the release galaxy file using the service
    console.log('Loading galaxy file...')
    const galaxyService = getGalaxyService()
    const galaxyHeader = await galaxyService.loadGalaxy()
    console.log('Galaxy header:', galaxyHeader)
    console.log(`Galaxy contains ${galaxyHeader.planets} levels`)

    // Store galaxy header in Redux (no ArrayBuffer)
    store.dispatch(loadGalaxyHeader(galaxyHeader))

    // Initialize lives (TOTAL_INITIAL_LIVES includes current ship + spare ships)
    store.dispatch(shipSlice.actions.setLives(TOTAL_INITIAL_LIVES))

    // Initialize status (score, bonus, etc.)
    store.dispatch(statusSlice.actions.initStatus())

    // Load level 1 using the level manager
    loadLevel(store as Store<RootState>, 1)

    initializationComplete = true
    console.log('Game initialization complete')
  } catch (error) {
    console.error('Error initializing game:', error)
    initializationError = error as Error
  }
}

/**
 * Get the current initialization status
 */
export const getInitializationStatus = (): {
  complete: boolean
  error: Error | null
} => ({
  complete: initializationComplete,
  error: initializationError
})

/**
 * Clean up resources (called when game ends)
 */
export const cleanupGame = (): void => {
  cleanupSoundService()
}

// Start initialization when module loads
void initializeGame()