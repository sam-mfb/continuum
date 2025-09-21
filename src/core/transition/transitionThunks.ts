/**
 * @fileoverview Thunks for managing level transitions
 */

import type { Store, Dispatch } from '@reduxjs/toolkit'
import type { TransitionRootState } from './types'
import type { FizzTransitionService } from './FizzTransitionService'
import type { MonochromeBitmap } from '@lib/bitmap'
import {
  playDiscrete,
  setThrusting,
  setShielding
} from '@core/sound/soundSlice'
import { SoundType } from '@core/sound/constants'
import { shipSlice } from '@core/ship/shipSlice'
import {
  decrementPreDelay,
  markFizzStarted,
  completeFizz,
  clearFizzFinished,
  incrementDelay,
  resetTransition
} from './transitionSlice'
import { TRANSITION_DELAY_FRAMES, FIZZ_DURATION } from './constants'

/**
 * Update the transition state for the current frame
 * Returns a bitmap to render if transition is active, null otherwise
 */
export function updateTransition<TState extends TransitionRootState>(
  currentFrameBitmap: MonochromeBitmap,
  renderContext: {
    addStatusBar: (bitmap: MonochromeBitmap) => MonochromeBitmap
    createTargetBitmap: (shipState: {
      deadCount: number
      shiprot: number
      shipx: number
      shipy: number
    }) => MonochromeBitmap
    store: Store<TState>
    fizzTransitionService: FizzTransitionService
    onTransitionComplete?: (store: Store<TState>) => void
  }
): (dispatch: Dispatch, getState: () => TState) => MonochromeBitmap | null {
  return (dispatch, getState) => {
    const state = getState().transition

    if (!state.active) {
      return null
    }

    // Handle pre-delay countdown
    if (state.preDelayFrames > 0) {
      dispatch(decrementPreDelay())

      // When countdown reaches zero, stop the ship
      const newState = getState().transition
      if (newState.preDelayFrames === 0) {
        dispatch(shipSlice.actions.stopShipMovement())
      }

      // Continue normal rendering during pre-delay
      return null
    }

    // Initialize fizz on first frame after pre-delay
    if (
      !renderContext.fizzTransitionService.isInitialized &&
      state.fizzActive &&
      !state.fizzStarted
    ) {
      // Play fizz start sound
      dispatch(playDiscrete(SoundType.FIZZ_SOUND))

      // Stop any continuous sounds
      dispatch(setThrusting(false))
      dispatch(setShielding(false))

      // Get ship state for creating target bitmap
      const shipState = getState().ship

      // Create the target bitmap using the passed callback
      const targetBitmap = renderContext.createTargetBitmap(shipState)

      // Initialize the fizz transition service with current frame and target
      renderContext.fizzTransitionService.initialize(
        currentFrameBitmap,
        targetBitmap,
        FIZZ_DURATION
      )

      // Mark fizz as started
      dispatch(markFizzStarted())

      // Return the first fizz frame
      const fizzFrame = renderContext.fizzTransitionService.nextFrame()
      return renderContext.addStatusBar(fizzFrame)
    }

    // Handle fizz in progress
    if (renderContext.fizzTransitionService.isInitialized && state.fizzActive) {
      if (renderContext.fizzTransitionService.isComplete) {
        // Fizz just completed
        dispatch(completeFizz())

        // Play echo sound
        dispatch(playDiscrete(SoundType.ECHO_SOUND))

        // Return the target bitmap from the service
        const images = renderContext.fizzTransitionService.getImages()
        return images.to ? renderContext.addStatusBar(images.to) : null
      } else {
        // Fizz still in progress
        const fizzFrame = renderContext.fizzTransitionService.nextFrame()
        return renderContext.addStatusBar(fizzFrame)
      }
    }

    // Handle post-fizz delay
    if (!state.fizzActive && state.active) {
      // Clear the "just finished" flag if set
      if (state.fizzJustFinished) {
        dispatch(clearFizzFinished())
      }

      // Increment delay counter
      dispatch(incrementDelay())

      // Check if delay is complete
      if (getState().transition.delayFrames >= TRANSITION_DELAY_FRAMES) {
        // Clean up transition state
        dispatch(resetTransition())

        // Reset the transition service now that everything is done
        renderContext.fizzTransitionService.reset()

        // Trigger the actual level load
        if (renderContext.onTransitionComplete) {
          renderContext.onTransitionComplete(renderContext.store)
        }

        // Return null to resume normal rendering
        return null
      }

      // Show target bitmap from service during delay
      const images = renderContext.fizzTransitionService.getImages()
      return images.to ? renderContext.addStatusBar(images.to) : null
    }

    return null
  }
}
