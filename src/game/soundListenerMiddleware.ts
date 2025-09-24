/**
 * Sound listener middleware using Redux Toolkit
 *
 * Processes sound state changes and triggers sound playback
 * through the sound service at appropriate times
 */

import type { SoundService } from '@/core/sound'
import { shotsSlice, isNewShot } from '@/core/shots'
import type { AppDispatch, RootState } from './store'
import type { TypedStartListening } from '@reduxjs/toolkit'

type SoundStartListening = TypedStartListening<RootState, AppDispatch>

/**
 * Setup the sound listener with access to the sound service
 *
 * @param soundStartListening - The typed startListening function from the middleware
 * @param soundService - The sound service instance to use for playback
 */
export function setupSoundListener(
  soundStartListening: SoundStartListening,
  soundService: SoundService
): void {
  // Listen for ship shot creation
  soundStartListening({
    actionCreator: shotsSlice.actions.initShipshot,
    effect: (_, listenerApi) => {
      // Get the state before and after the action
      const prevState = listenerApi.getOriginalState()
      const currentState = listenerApi.getState()

      // Check if a new shot was actually created
      const hasNewShot = isNewShot(
        prevState.shots.shipshots,
        currentState.shots.shipshots
      )

      // Play the ship fire sound if a new shot was created
      if (hasNewShot) {
        soundService.playShipFire()
      }
    }
  })
}
