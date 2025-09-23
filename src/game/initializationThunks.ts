/**
 * Game Initialization Thunks
 *
 * Handles the initial game setup including sound service,
 * galaxy loading, and initial state configuration using Redux thunks.
 */

import { createAsyncThunk } from '@reduxjs/toolkit'
import { shipSlice } from '@core/ship'
import { statusSlice } from '@core/status'
import { TOTAL_INITIAL_LIVES } from './constants'
import type { RootState } from './store'
import type { SoundService } from '@/core/sound'

/**
 * Initialize the game
 * Sets up sound service and initializes game state
 */
export const initializeGame = createAsyncThunk<
  undefined,
  void,
  { state: RootState; extra: { soundService: SoundService } }
>(
  'game/initialize',
  async (_, { getState, dispatch, extra }): Promise<undefined> => {
    const { soundService } = extra

    console.log('Starting game initialization...')

    // Configure sound service with initial settings
    console.log('Configuring sound service...')
    try {
      // Get initial sound settings from our store
      const soundState = getState().sound
      soundService.setVolume(soundState.volume)
      soundService.setMuted(!soundState.enabled)
      console.log('Sound service configured successfully')
    } catch (soundError) {
      console.warn('Failed to configure sound service:', soundError)
      // Continue without sound - game is still playable
    }

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
export const cleanupGame = createAsyncThunk<
  void,
  void,
  { extra: { soundService: SoundService } }
>('game/cleanup', async (_, { extra }): Promise<void> => {
  const { soundService } = extra
  soundService.cleanup()
})
