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

      // Check if ANY new shot is visible on screen
      const anyOnScreen = result.newShots.some(shot => {
        if (!shot.origin) return false
        const { x: bunkx, y: bunky } = shot.origin
        return (
          bunkx > screenx &&
          bunkx < screenr &&
          bunky > screeny &&
          bunky < screenb
        )
      })

      if (anyOnScreen) {
        // Play bunker sound for on-screen shots
        soundService.playBunkerShoot()
      } else {
        // Check if ANY new shot is within SOFTBORDER
        const anyNearScreen = result.newShots.some(shot => {
          if (!shot.origin) return false
          const { x: bunkx, y: bunky } = shot.origin
          return (
            bunkx > screenx - SOFTBORDER &&
            bunkx < screenr + SOFTBORDER &&
            bunky > screeny - SOFTBORDER &&
            bunky < screenb + SOFTBORDER
          )
        })

        if (anyNearScreen) {
          // Play soft sound for shots near screen
          soundService.playBunkerSoft()
        }
      }
    }
  })
}
