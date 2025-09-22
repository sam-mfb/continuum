/**
 * Game Initialization Module
 *
 * Handles the initial game setup including sound service,
 * galaxy loading, and initial state configuration.
 */

import type { GalaxyService } from '@core/galaxy'
import { initializeSoundService, cleanupSoundService } from '@core/sound'
import { shipSlice } from '@core/ship'
import { statusSlice } from '@core/status'
import { TOTAL_INITIAL_LIVES } from './constants'
import { loadGalaxyHeader } from './gameSlice'
import { store } from './store'

// Track initialization state
let initializationComplete = false
let initializationError: Error | null = null

/**
 * Initialize the game
 * Sets up sound service and initializes game state
 * @param galaxyService - The galaxy service instance to use (already loaded)
 * @returns The galaxy service for further use
 */
export const initializeGame = async (
  galaxyService: GalaxyService
): Promise<GalaxyService> => {
  try {
    console.log('Starting game initialization...')

    // Initialize sound service
    console.log('Initializing sound service...')
    try {
      // Get initial sound settings from our store
      const soundState = store.getState().sound
      await initializeSoundService({
        volume: soundState.volume,
        enabled: soundState.enabled
      })
      console.log('Sound service initialized successfully')
    } catch (soundError) {
      console.warn('Failed to initialize sound service:', soundError)
      // Continue without sound - game is still playable
    }

    // Get the already-loaded galaxy header from the service
    console.log('Getting galaxy header from service...')
    const galaxyHeader = galaxyService.getHeader()
    console.log('Galaxy header:', galaxyHeader)
    console.log(`Galaxy contains ${galaxyHeader.planets} levels`)

    // Store galaxy header in Redux (no ArrayBuffer)
    store.dispatch(loadGalaxyHeader(galaxyHeader))

    // Initialize lives (TOTAL_INITIAL_LIVES includes current ship + spare ships)
    store.dispatch(shipSlice.actions.setLives(TOTAL_INITIAL_LIVES))

    // Initialize status (score, bonus, etc.)
    store.dispatch(statusSlice.actions.initStatus())

    // Note: Level loading will now be done after initialization,
    // when the galaxy service can be passed to loadLevel

    initializationComplete = true
    console.log('Game initialization complete')
    return galaxyService
  } catch (error) {
    console.error('Error initializing game:', error)
    initializationError = error as Error
    throw error
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

// Note: Initialization is now triggered by main.tsx which creates and passes the galaxy service
