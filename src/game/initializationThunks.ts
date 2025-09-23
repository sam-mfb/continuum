/**
 * Game Initialization Thunks
 *
 * Handles the initial game setup including sound service,
 * galaxy loading, and initial state configuration using Redux thunks.
 */

import { createAsyncThunk } from '@reduxjs/toolkit'
import { createSoundService, cleanupSoundService } from '@core/sound'
import { shipSlice } from '@core/ship'
import { statusSlice } from '@core/status'
import { TOTAL_INITIAL_LIVES } from './constants'
import type { RootState } from './store'
import type { GalaxyService } from '@/core/galaxy'

/**
 * Initialize the game
 * Sets up sound service and initializes game state
 */
export const initializeGame = createAsyncThunk<
  undefined,
  void,
  { state: RootState; extra: { galaxyService: GalaxyService } }
>(
  'game/initialize',
  async (_, { getState, dispatch, extra }): Promise<undefined> => {
    const { galaxyService } = extra

    console.log('Starting game initialization...')

    // Initialize sound service
    console.log('Initializing sound service...')
    try {
      // Get initial sound settings from our store
      const soundState = getState().sound
      await createSoundService({
        volume: soundState.volume,
        muted: soundState.enabled
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

    // Initialize lives (TOTAL_INITIAL_LIVES includes current ship + spare ships)
    dispatch(shipSlice.actions.setLives(TOTAL_INITIAL_LIVES))

    // Initialize status (score, bonus, etc.)
    dispatch(statusSlice.actions.initStatus())

    console.log('Game initialization complete')
  }
)

/**
 * Clean up resources (called when game ends)
 * Also resets initialization state back to 'init'
 */
export const cleanupGame = createAsyncThunk(
  'game/cleanup',
  async (): Promise<void> => {
    cleanupSoundService()
  }
)
