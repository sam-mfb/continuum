/**
 * @fileoverview Thunks for managing level transitions
 */

import type { Store } from '@reduxjs/toolkit'
import type { AppDispatch, RootState } from '@/game/store'
import type { MonochromeBitmap } from '@lib/bitmap'
import { cloneBitmap } from '@lib/bitmap'
import type { SpriteServiceV2 } from '@core/sprites'
import { starBackground } from '@core/screen/render/starBackground'
import { fullFigure } from '@core/ship'
import { SCENTER } from '@core/figs/types'
import { createFizzTransition, type FizzTransition } from '@core/screen/render/fizz'
import { playDiscrete, setThrusting, setShielding } from '@core/sound/soundSlice'
import { SoundType } from '@core/sound/constants'
import { shipSlice } from '@core/ship/shipSlice'
import { sbarClear, updateSbar } from '@core/status'
import { transitionToNextLevel } from '@/game/levelManager'
import {
  startLevelTransition as startTransition,
  decrementPreDelay,
  initializeFizz,
  markFizzStarted,
  completeFizz,
  clearFizzFinished,
  incrementDelay,
  resetTransition
} from './transitionSlice'
import { TRANSITION_DELAY_FRAMES, FIZZ_DURATION } from './constants'

// Module-level state for the active fizz transition
// Not stored in Redux to keep state serializable
let activeFizzTransition: FizzTransition | null = null

/**
 * Start a level completion transition
 * Initializes the transition state ("to" bitmap will be created when fizz starts)
 */
export const startLevelTransition =
  () =>
  (dispatch: AppDispatch): void => {
    // Start the transition countdown
    dispatch(startTransition())

    // Initialize with empty bitmaps - they'll be created when fizz starts
    dispatch(
      initializeFizz({
        fromBitmap: new Uint8Array(0),
        toBitmap: new Uint8Array(0)
      })
    )
  }

/**
 * Update the transition state for the current frame
 * Returns a bitmap to render if transition is active, null otherwise
 */
export const updateTransition =
  (currentFrameBitmap: MonochromeBitmap, renderContext: {
    statusData: {
      fuel: number
      lives: number
      score: number
      bonus: number
      level: number
      message: string | null
      spriteService: SpriteServiceV2
    }
    store: Store<RootState> // Full store for level transition
  }) =>
  (dispatch: AppDispatch, getState: () => RootState): MonochromeBitmap | null => {
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
    if (!activeFizzTransition && state.fizzActive && !state.fizzStarted) {
      // Play fizz start sound
      dispatch(playDiscrete(SoundType.FIZZ_SOUND))

      // Stop any continuous sounds
      dispatch(setThrusting(false))
      dispatch(setShielding(false))

      // Capture the current frame as "from" bitmap
      const fromBitmapData = new Uint8Array(currentFrameBitmap.data)

      // Get current ship state for creating "to" bitmap with correct position
      const shipState = getState().ship
      const { spriteService } = renderContext.statusData

      // Create the "to" bitmap NOW with current ship position
      const toBitmapObj: MonochromeBitmap = {
        width: 512,
        height: 342,
        rowBytes: 64,
        data: new Uint8Array(512 * 342 / 8)
      }

      let shipSprite = null
      let shipMaskSprite = null
      if (shipState.deadCount === 0) {
        shipSprite = spriteService.getShipSprite(shipState.shiprot, { variant: 'def' })
        shipMaskSprite = spriteService.getShipSprite(shipState.shiprot, { variant: 'mask' })
      }

      const starBg = starBackground({
        starCount: 150,
        additionalRender: shipState.deadCount === 0
          ? (screen: MonochromeBitmap): MonochromeBitmap =>
              fullFigure({
                x: shipState.shipx - SCENTER,
                y: shipState.shipy - SCENTER,
                def: shipSprite!.bitmap,
                mask: shipMaskSprite!.bitmap
              })(screen)
          : undefined
      })(toBitmapObj)

      const toBitmapData = new Uint8Array(starBg.data)

      // Update Redux with both bitmaps
      dispatch(
        initializeFizz({
          fromBitmap: fromBitmapData,
          toBitmap: toBitmapData
        })
      )

      // Create the fizz transition instance
      const fromBitmap = cloneBitmap(currentFrameBitmap)
      const toBitmap = cloneBitmap(currentFrameBitmap)
      toBitmap.data = toBitmapData

      activeFizzTransition = createFizzTransition({
        from: fromBitmap,
        to: toBitmap,
        durationFrames: FIZZ_DURATION
      })

      // Mark fizz as started
      dispatch(markFizzStarted())

      // Return the first fizz frame
      const fizzFrame = activeFizzTransition.nextFrame()
      return addStatusBar(fizzFrame, renderContext.statusData)
    }

    // Handle fizz in progress
    if (activeFizzTransition) {
      if (activeFizzTransition.isComplete) {
        // Fizz just completed
        dispatch(completeFizz())

        // Play echo sound
        dispatch(playDiscrete(SoundType.ECHO_SOUND))

        // Clear the transition instance
        activeFizzTransition = null

        // Return star background
        const resultBitmap = cloneBitmap(currentFrameBitmap)
        resultBitmap.data.set(state.toBitmap!)
        return addStatusBar(resultBitmap, renderContext.statusData)
      } else {
        // Fizz still in progress
        const fizzFrame = activeFizzTransition.nextFrame()
        return addStatusBar(fizzFrame, renderContext.statusData)
      }
    }

    // Handle post-fizz delay
    if (!state.fizzActive && state.toBitmap) {
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

        // Trigger the actual level load
        transitionToNextLevel(renderContext.store)

        // Return null to resume normal rendering
        return null
      }

      // Show star background during delay
      const resultBitmap = cloneBitmap(currentFrameBitmap)
      resultBitmap.data.set(state.toBitmap)
      return addStatusBar(resultBitmap, renderContext.statusData)
    }

    return null
  }

/**
 * Helper to add status bar to a bitmap
 */
function addStatusBar(
  bitmap: MonochromeBitmap,
  statusData: {
    fuel: number
    lives: number
    score: number
    bonus: number
    level: number
    message: string | null
    spriteService: SpriteServiceV2
  }
): MonochromeBitmap {
  const { spriteService, ...data } = statusData
  const statusBarTemplate = spriteService.getStatusBarTemplate()

  let result = sbarClear({ statusBarTemplate })(bitmap)
  result = updateSbar({ ...data, spriteService })(result)

  return result
}

/**
 * Clean up module state when transition system resets
 */
export function cleanupTransition(): void {
  activeFizzTransition = null
}