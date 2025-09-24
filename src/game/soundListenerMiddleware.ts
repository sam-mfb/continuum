/**
 * Sound listener middleware using Redux Toolkit
 *
 * Processes sound state changes and triggers sound playback
 * through the sound service at appropriate times
 */

import type { SoundService } from '@/core/sound'
import { shotsSlice, isNewShot } from '@/core/shots'
import { SCRWTH, VIEWHT, SOFTBORDER } from '@/core/screen'
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
      const result = isNewShot(
        prevState.shots.shipshots,
        currentState.shots.shipshots
      )

      // Play the ship fire sound if a new shot was created
      if (result.numShots > 0) {
        soundService.playShipFire()
      }
    }
  })

  // Listen for bunker shot creation
  soundStartListening({
    actionCreator: shotsSlice.actions.bunkShoot,
    effect: (_, listenerApi) => {
      // Get the state before and after the action
      const prevState = listenerApi.getOriginalState()
      const currentState = listenerApi.getState()

      // Check if new bunker shots were created
      const result = isNewShot(
        prevState.shots.bunkshots,
        currentState.shots.bunkshots
      )

      // If no new shots, no sound needed
      if (result.numShots === 0) {
        return
      }

      // Get screen boundaries
      const { screenx, screeny } = currentState.screen
      const screenr = screenx + SCRWTH
      const screenb = screeny + VIEWHT

      // Play a sound for each new shot based on its proximity
      // The sound service's priority system will ensure only the highest priority plays
      for (const shot of result.newShots) {
        if (!shot.origin) continue
        const { x: bunkx, y: bunky } = shot.origin

        // Check if bunker is visible on screen
        if (
          bunkx > screenx &&
          bunkx < screenr &&
          bunky > screeny &&
          bunky < screenb
        ) {
          // Play bunker sound for on-screen shot
          soundService.playBunkerShoot()
        }
        // Check if bunker is within SOFTBORDER of screen
        else if (
          bunkx > screenx - SOFTBORDER &&
          bunkx < screenr + SOFTBORDER &&
          bunky > screeny - SOFTBORDER &&
          bunky < screenb + SOFTBORDER
        ) {
          // Play soft sound for shot near screen
          soundService.playBunkerSoft()
        }
      }
    }
  })
}
