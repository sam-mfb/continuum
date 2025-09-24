/**
 * Sound listener middleware using Redux Toolkit
 *
 * Processes sound state changes and triggers sound playback
 * through the sound service at appropriate times
 */

import type { SoundService } from '@/core/sound'
import type { AppDispatch, RootState } from './store'
import type { TypedStartListening } from '@reduxjs/toolkit'

type SoundStartListening = TypedStartListening<RootState, AppDispatch>

/**
 * Setup the sound listener with access to the sound service
 *
 * @param soundService - The sound service instance to use for playback
 */
export function setupSoundListener(
  soundStartListening: SoundStartListening,
  soundService: SoundService
): void {
  // Start listening for state changes
  soundStartListening({
    // For now, listen to all actions
    predicate: () => true,
    effect: async (action, listenerApi) => {
      // Get the current state
      const state = listenerApi.getState()

      // TODO: Migrate playSounds logic here
      // For now, just log to verify it's working
      console.log('Sound listener triggered:', {
        action: action.type,
        soundEnabled: state.sound.enabled,
        discrete: state.sound.discrete,
        continuous: state.sound.continuous,
        serviceReady: !!soundService
      })
    }
  })
}
