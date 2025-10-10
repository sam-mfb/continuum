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
import { explosionsSlice } from '@/core/explosions'
import { transitionSlice } from '@/core/transition'
import { shipSlice } from '@/core/ship'
import { appSlice } from './appSlice'
import { gameSlice } from './gameSlice'

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
  // adjust volume controls based on redux state
  soundStartListening({
    actionCreator: appSlice.actions.setVolume,
    effect: action => {
      soundService.setVolume(action.payload)
    }
  })

  soundStartListening({
    actionCreator: appSlice.actions.enableSound,
    effect: () => {
      soundService.setMuted(false)
    }
  })
  soundStartListening({
    actionCreator: appSlice.actions.disableSound,
    effect: () => {
      soundService.setMuted(true)
    }
  })

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

  // Listen for shield state - continuous sound that needs to keep playing
  soundStartListening({
    predicate: (_, currentState) => currentState.ship.shielding,
    effect: () => {
      // Keep trying to play shield sound while shielding is active
      // Priority system prevents duplicate plays
      // This will re-trigger shield if interrupted by higher priority sounds
      soundService.playShipShield()
    }
  })

  soundStartListening({
    predicate: (_, currentState) => !currentState.ship.shielding,
    effect: () => {
      soundService.stopShipShield()
    }
  })

  // Listen for thrust state - continuous sound that needs to keep playing
  soundStartListening({
    predicate: (_, currentState) => currentState.ship.thrusting,
    effect: () => {
      // Keep trying to play thrust sound while thrusting is active
      // Priority system prevents duplicate plays
      // This will re-trigger thrust if interrupted by higher priority sounds
      soundService.playShipThrust()
    }
  })
  soundStartListening({
    predicate: (_, currentState) => !currentState.ship.thrusting,
    effect: () => {
      soundService.stopShipThrust()
    }
  })

  // Listen for ship death
  soundStartListening({
    actionCreator: explosionsSlice.actions.startShipDeath,
    effect: () => {
      soundService.playShipExplosion()
    }
  })

  // Listen for bunker explosion
  soundStartListening({
    actionCreator: explosionsSlice.actions.startExplosion,
    effect: () => {
      soundService.playBunkerExplosion()
    }
  })

  // Listen for fuel collection
  soundStartListening({
    actionCreator: shipSlice.actions.collectFuel,
    effect: () => {
      soundService.playFuelCollect()
    }
  })

  // Listen for starmap transition
  soundStartListening({
    actionCreator: transitionSlice.actions.decrementPreFizz,
    effect: (_, listenerApi) => {
      if (listenerApi.getState().transition.preFizzFrames === 0) {
        soundService.playLevelTransition()
      }
    }
  })

  // Listen for starmap transition
  soundStartListening({
    actionCreator: transitionSlice.actions.transitionToStarmap,
    effect: () => {
      soundService.playEcho()
    }
  })

  // Handle cleanup on game over
  soundStartListening({
    actionCreator: gameSlice.actions.triggerGameOver,
    effect: () => {
      soundService.cleanup()
    }
  })
}
